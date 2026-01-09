(function ($) {
    const defaultSwalOptions = {
        title: 'Delete This Item?',
        text: 'This action cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        showLoaderOnConfirm: true,
        allowOutsideClick: false,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes',
        cancelButtonText: 'Cancel',
    };

    // Default attributes that should ALWAYS be reindexed
    const DEFAULT_REINDEX_ATTRIBUTES = ['id', 'for', 'aria-describedby', 'data-bv-field', 'data-bv-for'];

    $.fn.remAddRow = function (options) {
        // First, get user options to see if they provided custom reindex attributes
        const userReindexAttributes = options && options.reindexKnownAttributes ? options.reindexKnownAttributes : [];

        // Merge default attributes with user attributes (removing duplicates)
        const allReindexAttributes = [...new Set([...DEFAULT_REINDEX_ATTRIBUTES, ...userReindexAttributes])];

        const settings = $.extend(true, {
            addBtn: null,
            maxFields: 10,
            removeSelector: ".row_remove",
            fieldName: "rows",
            rowIdPrefix: "row",
            reindexOnRemove: true,
            startCounter: 0,
            rowTemplate: (i, name) => {
                const removeClass = settings.removeSelector.replace(/^\./, '');
                return `
                    <div class="row-box" id="${settings.rowIdPrefix}_${i}">
                        <span data-row-index>Row #${i+1}</span>
                        <input type="text" name="${name}[${i}]" />
                        <button type="button" class="${removeClass}" data-index="${i}">Remove</button>
                    </div>`;
            },
            onAdd: (i, e, $row, fieldName) => {},
            onRemove: (i, e, $row, fieldName) => {},
            idField: null,
            validator: { enabled: false, form: '#form', fields: {}, skipFields: [] },
            swal: { enabled: false, options: {}, ajax: {}, successCallback: null, errorCallback: null },
            templateVars: (template, values) => template.replace(/\{(\w+)\}/g, (m, k) => values[k] !== undefined ? values[k] : m),
            indexPattern: '_index',
            // This is now just a reference to the merged array, users can't override defaults
            reindexKnownAttributes: allReindexAttributes,
        }, options);

        // Override the reindexKnownAttributes with our merged array
        // (this ensures user can't override the defaults)
        settings.reindexKnownAttributes = allReindexAttributes;

        settings.swal.options = $.extend(true, {}, defaultSwalOptions, settings.swal.options || {});
        const $wrapper = this;
        const $addBtn = $(settings.addBtn);

        function escapeRegex(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
        const namePrefixRegex = new RegExp('^'+escapeRegex(settings.fieldName)+'\\[\\d+\\]');

        function reindexRow($row, i) {
            // Store the current index from the row's ID or data-index
            const currentMatch = $row.attr('id').match(new RegExp(escapeRegex(settings.rowIdPrefix) + '_(\\d+)'));
            const currentIndex = currentMatch ? currentMatch[1] : null;

            // Update row ID
            $row.attr('id', `${settings.rowIdPrefix}_${i}`);

            // Update data-row-index elements
            $row.find('[data-row-index]').each(function () {
                $(this).text($(this).data('row-index-offset') ? $(this).data('row-index-offset') + i : i + 1);
            });

            // Update name attributes - THIS IS WORKING, DON'T CHANGE
            $row.find('input[name], select[name], textarea[name]').each(function () {
                const name = $(this).attr('name');
                if(!name) return;
                // Replace the specific index in the name
                const newName = name.replace(
                    new RegExp(escapeRegex(settings.fieldName) + '\\[' + (currentIndex !== null ? currentIndex : '\\d+') + '\\]'),
                    `${settings.fieldName}[${i}]`
                );
                $(this).attr('name', newName);
            });

            // Update remove button data-index - THIS IS WORKING, DON'T CHANGE
            $row.find(settings.removeSelector).attr('data-index', i);

            // Process reindexKnownAttributes for attributes like id, for, aria-describedby
            if (settings.reindexKnownAttributes && settings.reindexKnownAttributes.length > 0 && currentIndex !== null) {
                // Create selector for all attributes that need reindexing
                const selector = settings.reindexKnownAttributes
                    .map(attr => `[${attr}]`)
                    .join(',');

                $row.find(selector).each(function () {
                    const $this = $(this);
                    settings.reindexKnownAttributes.forEach(attr => {
                        const val = $this.attr(attr);
                        if(val) {
                            // Check if this is a Bootstrap Validator field that needs special handling
                            if ((attr === 'data-bv-field' || attr === 'data-bv-for') && val.includes(settings.fieldName + '[' + currentIndex + ']')) {
                                // Special handling for Bootstrap Validator fields
                                const newVal = val.replace(
                                    new RegExp(escapeRegex(settings.fieldName) + '\\[' + currentIndex + '\\]'),
                                    `${settings.fieldName}[${i}]`
                                );
                                if(newVal !== val) {
                                    $this.attr(attr, newVal);
                                }
                            }
                            // Check if it contains the indexPattern placeholder
                            else if (settings.indexPattern && val.includes(settings.indexPattern)) {
                                // Replace the indexPattern placeholder
                                const newVal = val.replace(
                                    new RegExp(escapeRegex(settings.indexPattern), 'g'),
                                    i
                                );
                                if(newVal !== val) {
                                    $this.attr(attr, newVal);
                                }
                            }
                            // For other attributes like id, for, aria-describedby
                            // We need to find and replace the currentIndex number
                            else {
                                // Look for the currentIndex as a standalone number or preceded/followed by non-digits
                                // This handles patterns like: email_2, row2, item-2, etc.
                                const pattern = new RegExp('(^|\\D)' + escapeRegex(currentIndex) + '(\\D|$)', 'g');
                                const newVal = val.replace(pattern, function(match) {
                                    // Replace the index in the match while preserving surrounding characters
                                    return match.replace(new RegExp(escapeRegex(currentIndex)), i);
                                });
                                if(newVal !== val) {
                                    $this.attr(attr, newVal);
                                }
                            }
                        }
                    });
                });
            }
        }

        function reindexRows() {
            $wrapper.children().each(function(i){
                reindexRow($(this), i);
            });
        }

        function removeRowAndReindex($row) {
            if(settings.validator.enabled) removeValidators($row);
            $row.remove();
            if(settings.reindexOnRemove) reindexRows();
            updateAddBtnState();
        }

        function updateAddBtnState() {
            if(!$addBtn.length) return;
            $addBtn.prop('disabled', $wrapper.children().length >= settings.maxFields);
        }

        function getIdFieldValue($row, index) {
            if(!settings.idField) return null;
            const fieldName = settings.idField.replace(/\{index\}/g,index);
            const $field = $row.find(`[name="${fieldName}"]`);
            return $field.length ? $field.val()?.trim()||null : null;
        }

        function registerValidators(index, $row) {
            if(!settings.validator.enabled) return;
            const $form = $(settings.validator.form);
            if(!$form.length || !$.fn.bootstrapValidator) return;
            Object.keys(settings.validator.fields).forEach(pattern => {
                if(settings.validator.skipFields.includes(pattern)) return;
                const fieldName = pattern.replace(/\{index\}/g,index);
                const $field = $row.find(`[name="${fieldName}"]`);
                if($field.length){
                    try{ $form.bootstrapValidator('addField', $field, settings.validator.fields[pattern]); }
                    catch(e){ console.warn(`remAddRow: Failed to add validator ${fieldName}`, e); }
                }
            });
        }

        function removeValidators($row) {
            if(!settings.validator.enabled) return;
            const $form = $(settings.validator.form);
            if(!$form.length || !$.fn.bootstrapValidator) return;
            Object.keys(settings.validator.fields).forEach(pattern => {
                const $field = $row.find(`[name^="${settings.fieldName}"]`);
                if($field.length) try{ $form.bootstrapValidator('removeField', $field); } catch(e){}
            });
        }

        function handleAjaxDelete(id,index,$row,e) {
            const SwalInstance = window.Swal || window.swal;
            if(!settings.swal.enabled || !SwalInstance || !settings.swal.ajax.url){ removeRowAndReindex($row); return; }
            const vars = {fieldName:settings.fieldName, id:index, index, rowId:$row.attr('id')};
            const url = settings.templateVars(settings.swal.ajax.url,vars);
            let ajaxData = {};
            if(settings.swal.ajax.data) Object.keys(settings.swal.ajax.data).forEach(k=>{
                const v=settings.swal.ajax.data[k];
                ajaxData[k] = typeof v==='string'?settings.templateVars(v,vars):v;
            });
            SwalInstance.fire(settings.swal.options).then(r=>{
                if(r.isConfirmed){
                    $.ajax({url,method:settings.swal.ajax.method,data:ajaxData,dataType:'json'})
                    .done(resp=>{
                        if(typeof settings.swal.successCallback==='function') settings.swal.successCallback(resp,$row,vars);
                        else SwalInstance.fire('Deleted!','Item has been deleted.','success').then(()=>removeRowAndReindex($row));
                    })
                    .fail(xhr=>{
                        if(typeof settings.swal.errorCallback==='function') settings.swal.errorCallback(xhr,$row,vars);
                        else SwalInstance.fire('Error!','Failed to delete item.','error');
                    });
                }
            });
        }

        if(settings.reindexOnRemove) reindexRows();
        updateAddBtnState();

        // Add button
        $addBtn.on('click', e=>{
            const index = $wrapper.children().length;
            if(index >= settings.maxFields) return;
            const $row = $(settings.rowTemplate(index,settings.fieldName));
            $wrapper.append($row);
            if(settings.reindexOnRemove) reindexRows();
            settings.onAdd(index,e,$row,settings.fieldName);
            if(settings.validator.enabled) registerValidators(index,$row);
            updateAddBtnState();
        });

        // Remove button — FIXED: use normal function, not arrow
        $wrapper.on('click', settings.removeSelector, function(e){
            const clicked = $(this), index = clicked.data('index');
            let $target = clicked.closest(`#${settings.rowIdPrefix}_${index}`);
            if(!$target.length) $target = clicked.closest('.row-box');
            if($target.length){
                settings.onRemove?.(index,e,$target,settings.fieldName);
                if(e.isDefaultPrevented()) return;
                const idValue = getIdFieldValue($target,index);
                if(idValue && settings.swal.enabled) handleAjaxDelete(idValue,index,$target,e);
                else removeRowAndReindex($target);
            }
        });

        return this;
    };
})(jQuery);

export default $;
