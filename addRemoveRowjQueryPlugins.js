(function ($) {
	$.fn.remAddRow = function (options) {
		const settings = $.extend({
			// Original options
			addBtn: null,
			maxFields: 10,
			removeSelector: ".row_remove",
			fieldName: "rows",
			rowIdPrefix: "row",
			reindexOnRemove: true,
			rowTemplate: (i, name) => {
				const removeClass = (".row_remove".replace(/^\./, ""));
				return `
				<div class="row-box" id="row_${i}">
					<span data-row-index>Row #${i+1}</span>
					<input type="text" name="${name}[${i}]" />
					<button type="button" class="${removeClass}" data-index="${i}">Remove</button>
				</div>
				`;
			},
			startCounter: 0,
			onAdd: (i, $row) => {},
			onRemove: (i, event) => {},

			// New: SweetAlert2 Configuration
			swal: {
				enabled: false,
				options: {
					title: 'Delete Item',
					text: 'Are you sure you want to delete this item?',
					icon: 'warning',
					showCancelButton: true,
					confirmButtonColor: '#3085d6',
					cancelButtonColor: '#d33',
					confirmButtonText: 'Yes, delete it!',
					cancelButtonText: 'Cancel'
				},
				ajax: {
					url: null, // Required if enabled (supports {fieldName}, {id}, {index}, {rowId})
					method: 'DELETE',
					data: {
						id: '{id}',
						_token: '{{ csrf_token() }}'
					}
				},
				successCallback: null,
				errorCallback: null
			},

			// New: Bootstrap Validator Configuration
			validator: {
				enabled: false,
				form: '#form',
				fields: {}, // Format: 'fieldName[{index}][subfield]': { validators: {} }
				skipFields: [] // Fields to skip auto-validation
			},

			// New: ID Field Configuration
			idField: null, // Format: 'fieldName[{index}][id]' - tells plugin where to find ID

			// New: Template variable replacement function
			templateVars: (template, values) => {
				return template.replace(/\{(\w+)\}/g, (match, key) => {
					return values[key] !== undefined ? values[key] : match;
				});
			}

		}, options);

		const $wrapper = this;
		const $addBtn = $(settings.addBtn);

		// Escape a string for safe use in a RegExp
		function escapeRegex(s) {
			return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		}

		// Regex to detect names beginning with `fieldName[<number>]`
		const namePrefixRegex = new RegExp('^' + escapeRegex(settings.fieldName) + '\\[\\d+\\]');

		// Reindex rows so indexes in names and data-id become 0..n-1
		function reindexRows() {
			$wrapper.children().each(function (i) {
				const $row = $(this);

				// Set new id like prefix_i
				$row.attr('id', `${settings.rowIdPrefix}_${i}`);

				// Update any visible "index" elements if present
				$row.find('[data-row-index]').each(function () {
					$(this).text($(this).data('row-index-offset') ? $(this).data('row-index-offset') + i : i + 1);
				});

				// Rename inputs/selects/textareas that start with fieldName[...] => fieldName[i]...
				$row.find('input[name], select[name], textarea[name]').each(function () {
					const name = $(this).attr('name');
					if (!name) return;
					const newName = name.replace(namePrefixRegex, `${settings.fieldName}[${i}]`);
					$(this).attr('name', newName);
				});

				// Update remove button data-id(s)
				$row.find(settings.removeSelector).attr('data-index', i);
			});
		}

		function removeRowAndReindex($row) {
			$row.remove();
			if (settings.reindexOnRemove) {
				reindexRows();
			}
			updateAddBtnState();
		}

		// Update add button enabled state using actual current count
		function updateAddBtnState() {
			if (!$addBtn.length) return;
			const currentCount = $wrapper.children().length;
			$addBtn.prop('disabled', currentCount >= settings.maxFields);
		}

		// Get ID field value from a row
		function getIdFieldValue($row, index) {
			if (!settings.idField) return null;

			// Replace {index} with actual index
			const idFieldName = settings.idField.replace(/\{index\}/g, index);
			const $idField = $row.find(`[name="${idFieldName}"]`);

			if ($idField.length) {
				const value = $idField.val();
				return value ? value.trim() : null;
			}

			return null;
		}

		// Register validators for a row
		function registerValidators(index, $row) {
			if (!settings.validator.enabled) return;

			const $form = $(settings.validator.form);
			if (!$form.length || !$.fn.bootstrapValidator) {
				console.warn('remAddRow: BootstrapValidator not found or form selector invalid');
				return;
			}

			// Register validators for each configured field
			Object.keys(settings.validator.fields).forEach(fieldPattern => {
				// Skip fields in skip list
				if (settings.validator.skipFields.includes(fieldPattern)) return;

				// Replace {index} with actual index
				const fieldName = fieldPattern.replace(/\{index\}/g, index);
				const $field = $row.find(`[name="${fieldName}"]`);

				if ($field.length) {
					try {
						$form.bootstrapValidator('addField', $field, settings.validator.fields[fieldPattern]);
					} catch (e) {
						console.warn(`remAddRow: Failed to add validator for field ${fieldName}:`, e);
					}
				}
			});
		}

		// Remove validators for a row
		function removeValidators(index, $row) {
			if (!settings.validator.enabled) return;

			const $form = $(settings.validator.form);
			if (!$form.length || !$.fn.bootstrapValidator) return;

			// Remove validators for each configured field
			Object.keys(settings.validator.fields).forEach(fieldPattern => {
				// Skip fields in skip list
				if (settings.validator.skipFields.includes(fieldPattern)) return;

				const fieldName = fieldPattern.replace(/\{index\}/g, index);
				const $field = $row.find(`[name="${fieldName}"]`);

				if ($field.length) {
					try {
						$form.bootstrapValidator('removeField', $field);
					} catch (e) {
						// Field might not have been registered yet
					}
				}
			});
		}

		// Handle AJAX deletion with SweetAlert2
		function handleAjaxDelete(id, index, $row, event) {
			const SwalInstance = window.Swal || window.swal;
			if (!settings.swal.enabled || !window.swal || !settings.swal.ajax.url) {
				// If no SweetAlert2 or no URL, just remove the row
				// $row.remove();
				removeRowAndReindex($row);
				return;
			}

			// Prepare template variables
			const templateVars = {
				fieldName: settings.fieldName,
				id: id,
				index: index,
				rowId: $row.attr('id')
			};

			// Replace template variables in URL
			const deleteUrl = settings.templateVars(settings.swal.ajax.url, templateVars);

			// Prepare AJAX data
			let ajaxData = {};
			if (settings.swal.ajax.data) {
				Object.keys(settings.swal.ajax.data).forEach(key => {
					const value = settings.swal.ajax.data[key];
					ajaxData[key] = typeof value === 'string' ?
						settings.templateVars(value, templateVars) : value;
				});
			}

			// Show SweetAlert2 confirmation
			SwalInstance.fire(settings.swal.options).then((result) => {
				if (result.isConfirmed) {
					// Make AJAX request
					$.ajax({
						url: deleteUrl,
						method: settings.swal.ajax.method,
						data: ajaxData,
						dataType: 'json'
					})
					.done((response) => {
						// Call success callback if provided
						if (typeof settings.swal.successCallback === 'function') {
							settings.swal.successCallback(response, $row, templateVars);
						} else {
							// Default success behavior
							SwalInstance.fire(
								'Deleted!',
								'Item has been deleted.',
								'success'
							).then(() => {
								removeRowAndReindex($row);
							});
						}
					})
					.fail((xhr) => {
						// Call error callback if provided
						if (typeof settings.swal.errorCallback === 'function') {
							settings.swal.errorCallback(xhr, $row, templateVars);
						} else {
							// Default error behavior
							SwalInstance.fire(
								'Error!',
								'Failed to delete item.',
								'error'
							);
						}
					});
				}
			});
		}

		// Initialize: ensure pre-existing rows are reindexed (if any)
		if (settings.reindexOnRemove) reindexRows();
		updateAddBtnState();

		// ADD handler
		$addBtn.on('click', function (e) {
			const currentCount = $wrapper.children().length;
			if (currentCount >= settings.maxFields) return;
			const index = currentCount;
			const $row = $(settings.rowTemplate(index, settings.fieldName));
			$wrapper.append($row);

			// If rowTemplate didn't embed the correct data-id or names, we reindex to be safe
			if (settings.reindexOnRemove) reindexRows();

			// Call user's onAdd callback FIRST
			settings.onAdd(index, e, $row, settings.fieldName);

			// Then register validators if enabled
			if (settings.validator.enabled) {
				registerValidators(index, $row);
			}

			updateAddBtnState();
		});

		// REMOVE handler
		$wrapper.on('click', settings.removeSelector, function (e) {
			e.preventDefault();
			const clicked = $(this);
			const index = clicked.data('index');

			// Find the row to remove
			let $target = clicked.closest(`[id$="_${index}"]`);
			if (!$target.length) {
				$target = clicked.parents().filter(function () {
					return $(this).parent().is($wrapper);
				}).first();
			}
			if (!$target.length) $target = clicked.closest('.row-box');

			if ($target.length) {
				// Call user's onRemove callback FIRST
				settings.onRemove?.(index, e, $target, settings.fieldName);

				// If user didn't prevent default, proceed with plugin's removal logic
				if (!e.isDefaultPrevented()) {
					// Get ID field value
					const idValue = getIdFieldValue($target, index);

					// Remove validators if enabled
					if (settings.validator.enabled) {
						removeValidators(index, $target);
					}

					// If ID exists and SweetAlert2 is enabled, handle AJAX delete
					if (idValue && settings.swal.enabled) {
						handleAjaxDelete(idValue, index, $target, e);
					} else {
						// No ID or SweetAlert2 disabled - remove immediately
						removeRowAndReindex($target);
					}

					// Reindex if needed
					// if (settings.reindexOnRemove && !$target.closest('body').length) {
					// 	reindexRows();
					// }
				}

				// updateAddBtnState();
			} else {
				console.warn('remAddRow: could not locate row to remove for index=', index);
			}
		});

		return this;
	};
})(jQuery);
export default $; // so we can import jQuery with plugin attached
