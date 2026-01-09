# remAddRow jQuery Plugin

A flexible jQuery plugin for **dynamically adding and removing form
rows** with:

-   Safe index reindexing
-   Database ID vs UI index separation
-   Optional SweetAlert2 + AJAX deletion
-   Optional BootstrapValidator integration

------------------------------------------------------------------------

## ✨ Features

-   Add / remove rows dynamically
-   UI index (`data-index`) separated from database ID
-   Automatic reindexing after removal (AJAX or non-AJAX)
-   SweetAlert2 confirmation + AJAX delete support
-   BootstrapValidator auto add/remove fields
-   Fully customizable row template
-   Works with Laravel, Blade, CSRF, REST APIs

------------------------------------------------------------------------

## 📦 Installation

``` bash
npm install jquery sweetalert2
```

``` js
import $ from 'jquery';
import swal from 'sweetalert2';

window.$ = $;
window.jQuery = $;
window.swal = swal;

import './remAddRow.js';
```

------------------------------------------------------------------------

## 🧠 Core Concepts

### UI Index vs Database ID

-   **Index** → position in the DOM (`0,1,2,...`)
-   **ID** → database primary key (hidden input)

They are **never the same thing**.

``` html
<input type="hidden" name="person[0][id]" value="42">
```

The plugin reads the ID only when AJAX delete is required.

------------------------------------------------------------------------

## 🔧 Plugin Options

### Required / Common Options

  Option             Type     Description
  ------------------ -------- ----------------------------
  `addBtn`           string   Selector for add button
  `removeSelector`   string   Selector for remove button
  `fieldName`        string   Root field name
  `rowIdPrefix`      string   DOM row ID prefix
  `maxFields`        number   Max rows allowed

------------------------------------------------------------------------

### ID Handling

``` js
idField: 'person[{index}][id]'
```

-   Tells plugin where to read database ID
-   If ID exists → AJAX delete
-   If ID missing → direct remove

------------------------------------------------------------------------

### SweetAlert2 + AJAX Delete

``` js
swal: {
  enabled: true,
  options: {
    title: 'Delete',
    icon: 'warning',
    showCancelButton: true
  },
  ajax: {
    url: '/api/person/{id}',
    method: 'DELETE',
    data: {
      _token: '{{ csrf_token() }}'
    }
  }
}
```

Template variables supported:

-   `{id}`
-   `{index}`
-   `{fieldName}`
-   `{rowId}`

------------------------------------------------------------------------

### BootstrapValidator

``` js
validator: {
  enabled: true,
  form: '#myForm',
  fields: {
    'person[{index}][name]': {
      validators: {
        notEmpty: { message: 'Required' }
      }
    }
  }
}
```

-   Automatically adds/removes validators
-   Works with dynamic indexes

------------------------------------------------------------------------

## 🚦 Removal Flow Explained

### 1️⃣ Non-AJAX Remove

Triggered when:

-   `idField` is not configured **OR**
-   Hidden ID input is empty

``` js
<input type="hidden" name="person[0][id]" value="">
```

Behavior:

-   Row removed immediately
-   DOM reindexed
-   No server call

------------------------------------------------------------------------

### 2️⃣ AJAX + SweetAlert Remove

Triggered when:

-   `idField` exists
-   Hidden ID has value
-   `swal.enabled === true`

Flow:

1.  Show SweetAlert2 confirmation
2.  Send AJAX DELETE request
3.  On success → remove row
4.  Reindex remaining rows

------------------------------------------------------------------------

## 🧪 Usage Examples

------------------------------------------------------------------------

### 🟢 Minimal Usage

``` js
$("#jdesc_wrap").remAddRow({
  addBtn: "#jdesc_add",
  maxFields: 3,
  removeSelector: ".exp_remove",
  fieldName: "person",
  rowIdPrefix: "jdesc",
  rowTemplate: (i, name) => `
    <div id="jdesc_${i}" class="col-sm-12 row jdesc_row">
      <input type="hidden" name="${name}[${i}][id]">
      <div class="form-group row m-1">
        <label class="col-form-label col-sm-4">Name : </label>
        <div class="col-sm-8 my-auto">
          <input type="text" name="${name}[${i}][name]" class="form-control form-control-sm" placeholder="Name">
        </div>
      </div>
      <button type="button" class="btn btn-sm btn-danger exp_remove" data-index="${i}">
        Remove Row
      </button>
    </div>
  `,
  onAdd: (i, e, $r, name) => {
    console.log("Row added:", i);
  }
});
```

------------------------------------------------------------------------

### 🟡 Medium Usage

``` js
$("#jdesc_wrap").remAddRow({
  addBtn: "#jdesc_add",
  maxFields: 3,
  removeSelector: ".exp_remove",
  fieldName: "person",
  rowIdPrefix: "jdesc",
  idField: 'person[{index}][id]', // Tell plugin where to find ID

  // SweetAlert2 Configuration
  swal: {
    enabled: true,
    options: {
      title: 'Delete Person',
      text: 'Are you sure you want to delete this person?',
      icon: 'warning'
    },
    ajax: {
      url: '/api/person/{id}', // Supports {id}, {index}, {fieldName}
      method: 'DELETE',
      data: {
        id: '{id}',
        _token: '{{ csrf_token() }}'
      }
    },
    successCallback: function(response, $row, vars) {
      swal.fire('Success!', response.message, 'success').then(() => {
        $row.remove();
      });
    }
  },

  // Bootstrap Validator Configuration
  validator: {
    enabled: true,
    form: '#myForm',
    fields: {
      'person[{index}][name]': {
        validators: {
          notEmpty: {
            message: 'Please insert name.'
          },
          stringLength: {
            min: 2,
            max: 100,
            message: 'Name must be between 2-100 characters'
          }
        }
      },
      'person[{index}][email]': {
        validators: {
          emailAddress: {
            message: 'Please enter a valid email address'
          }
        }
      }
    },
    skipFields: [] // Fields to skip auto-validation
  },

  // Custom row template
  rowTemplate: (i, name) => `
    <div id="jdesc_${i}" class="row">
      <input type="hidden" name="${name}[${i}][id]">

      <div class="col-md-6">
        <input type="text" name="${name}[${i}][name]" class="form-control" placeholder="Name">
      </div>

      <div class="col-md-6">
        <input type="email" name="${name}[${i}][email]" class="form-control" placeholder="Email">
      </div>

      <div class="col-md-12">
        <button type="button" class="btn btn-danger exp_remove" data-index="${i}">
          Remove
        </button>
      </div>
    </div>
  `,

  // User callbacks (run before plugin features)
  onAdd: (i, e, $row, name) => {
    console.log('User: Row added at index', i);
    // User can add additional validators here
    $('#myForm').bootstrapValidator('addField',
      $row.find(`[name="${name}[${i}][custom]"]`),
      { validators: { /* custom rules */ } }
    );
  },

  onRemove: (i, e, $row, name) => {
    console.log('User: About to remove row', i);
    // User can prevent default if needed
    // e.preventDefault(); // This stops plugin's removal logic
  }
});
```

------------------------------------------------------------------------

### 🔴 Full Usage (AJAX + Validator)

```html
<div class="container mt-4">
    <form id="multiForm" method="POST" action="/save">
        @csrf

        <!-- Parent Section: Employees -->
        <div class="card mb-4">
            <div class="card-header bg-primary text-white">
                <h5 class="mb-0">Employee Management</h5>
            </div>
            <div class="card-body">
                <div class="row mb-3">
                    <div class="col-sm-12">
                        <button type="button" id="addEmployee" class="btn btn-primary btn-sm">
                            <i class="fas fa-plus"></i> Add Employee
                        </button>
                    </div>
                </div>

                <!-- Employee Container -->
                <div class="row" id="employees_wrap">
                    <!-- Dynamic employee rows will be added here -->
                </div>
            </div>
        </div>

        <div class="form-group">
            <button type="submit" class="btn btn-success">Save All Data</button>
        </div>
    </form>
</div>
```

JavaScript Implementation


``` js
$(document).ready(function() {
    // Initialize Bootstrap Validator for the main form
    $('#multiForm').bootstrapValidator({
        excluded: [':disabled'],
        feedbackIcons: {
            valid: 'fas fa-check',
            invalid: 'fas fa-times',
            validating: 'fas fa-sync-alt'
        },
        fields: {
            // We'll add dynamic fields programmatically
        }
    });

    // Initialize parent container (Employees)
    $('#employees_wrap').remAddRow({
        // Basic Configuration
        addBtn: '#addEmployee',
        maxFields: 5,
        removeSelector: '.remove-employee',
        fieldName: 'employees',
        rowIdPrefix: 'emp',
        reindexOnRemove: true,

        // ID Field Configuration
        idField: 'employees[{index}][id]',

        // SweetAlert2 Configuration for Employee Deletion
        swal: {
            enabled: true,
            options: {
                title: 'Delete Employee',
                text: 'Are you sure you want to delete this employee and all their data?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Yes, delete it!',
                cancelButtonText: 'Cancel',
                showLoaderOnConfirm: true,
                allowOutsideClick: () => !swal.isLoading()
            },
            ajax: {
                url: '/api/employees/{id}',
                method: 'DELETE',
                data: {
                    id: '{id}',
                    _token: $('meta[name="csrf-token"]').attr('content'),
                    cascade: true  // Delete associated records too
                }
            },
            successCallback: function(response, $row, vars) {
                // Custom success handling
                swal.fire({
                    title: 'Deleted!',
                    text: response.message || 'Employee has been deleted.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                }).then(() => {
                    $row.remove();
                });
            },
            errorCallback: function(xhr, $row, vars) {
                // Custom error handling
                swal.fire(
                    'Error!',
                    xhr.responseJSON?.message || 'Failed to delete employee.',
                    'error'
                );
            }
        },

        // Bootstrap Validator Configuration for Employee Fields
        validator: {
            enabled: true,
            form: '#multiForm',
            fields: {
                'employees[{index}][name]': {
                    validators: {
                        notEmpty: {
                            message: 'Employee name is required'
                        },
                        stringLength: {
                            min: 2,
                            max: 100,
                            message: 'Name must be between 2 and 100 characters'
                        },
                        regexp: {
                            regexp: /^[A-Za-z\s]+$/,
                            message: 'Name can only contain letters and spaces'
                        }
                    }
                },
                'employees[{index}][email]': {
                    validators: {
                        notEmpty: {
                            message: 'Email is required'
                        },
                        emailAddress: {
                            message: 'Please enter a valid email address'
                        },
                        remote: {
                            url: '/api/check-email',
                            message: 'This email is already registered',
                            data: function(validator, $field, value) {
                                return {
                                    id: $field.closest('.employee-row').find('[name$="[id]"]').val()
                                };
                            }
                        }
                    }
                },
                'employees[{index}][age]': {
                    validators: {
                        notEmpty: {
                            message: 'Age is required'
                        },
                        between: {
                            min: 18,
                            max: 65,
                            message: 'Age must be between 18 and 65'
                        },
                        digits: {
                            message: 'Age must be a number'
                        }
                    }
                },
                'employees[{index}][department]': {
                    validators: {
                        notEmpty: {
                            message: 'Department is required'
                        }
                    }
                }
            },
            skipFields: [
                'employees[{index}][id]',
                'employees[{index}][emergency_contacts][{phone_index}][id]'
            ]
        },

        // Row Template for Employee (Parent Row)
        rowTemplate: (i, name) => `
            <div id="emp_${i}" class="col-sm-12 employee-row mb-4 p-3 border rounded">
                <!-- Employee ID (Hidden) -->
                <input type="hidden" name="${name}[${i}][id]" value="">

                <div class="row mb-2">
                    <div class="col-sm-6">
                        <label class="form-label">Employee Name *</label>
                        <input type="text"
                               name="${name}[${i}][name]"
                               class="form-control form-control-sm"
                               placeholder="Enter full name">
                        <div class="form-text">Required field</div>
                    </div>

                    <div class="col-sm-6">
                        <label class="form-label">Email Address *</label>
                        <input type="email"
                               name="${name}[${i}][email]"
                               class="form-control form-control-sm"
                               placeholder="employee@example.com">
                    </div>
                </div>

                <div class="row mb-2">
                    <div class="col-sm-4">
                        <label class="form-label">Age *</label>
                        <input type="number"
                               name="${name}[${i}][age]"
                               class="form-control form-control-sm"
                               min="18" max="65"
                               placeholder="Age">
                    </div>

                    <div class="col-sm-4">
                        <label class="form-label">Department *</label>
                        <select name="${name}[${i}][department]"
                                class="form-select form-select-sm">
                            <option value="">Select Department</option>
                            <option value="IT">IT</option>
                            <option value="HR">Human Resources</option>
                            <option value="Finance">Finance</option>
                            <option value="Sales">Sales</option>
                            <option value="Marketing">Marketing</option>
                        </select>
                    </div>

                    <div class="col-sm-4">
                        <label class="form-label">Join Date</label>
                        <input type="date"
                               name="${name}[${i}][join_date]"
                               class="form-control form-control-sm">
                    </div>
                </div>

                <!-- Nested Section: Emergency Contacts -->
                <div class="nested-section mt-3 p-3 bg-light border rounded">
                    <h6 class="border-bottom pb-2">
                        <i class="fas fa-phone"></i> Emergency Contacts
                        <small class="text-muted">(Max 3 contacts)</small>
                    </h6>

                    <div class="mb-2">
                        <button type="button"
                                class="btn btn-outline-secondary btn-sm add-contact"
                                data-emp-index="${i}">
                            <i class="fas fa-plus-circle"></i> Add Contact
                        </button>
                    </div>

                    <!-- Contact Container -->
                    <div class="contacts-wrap" id="contacts_${i}">
                        <!-- Dynamic contact rows will be added here -->
                    </div>
                </div>

                <!-- Nested Section: Dependents -->
                <div class="nested-section mt-3 p-3 bg-light border rounded">
                    <h6 class="border-bottom pb-2">
                        <i class="fas fa-users"></i> Dependents
                    </h6>

                    <div class="mb-2">
                        <button type="button"
                                class="btn btn-outline-secondary btn-sm add-dependent"
                                data-emp-index="${i}">
                            <i class="fas fa-user-plus"></i> Add Dependent
                        </button>
                    </div>

                    <!-- Dependent Container -->
                    <div class="dependents-wrap" id="dependents_${i}">
                        <!-- Dynamic dependent rows will be added here -->
                    </div>
                </div>

                <!-- Remove Employee Button -->
                <div class="mt-3 text-end">
                    <button type="button"
                            class="btn btn-danger btn-sm remove-employee"
                            data-id="${i}">
                        <i class="fas fa-trash"></i> Remove Employee
                    </button>
                </div>
            </div>
        `,

        // Callbacks
        onAdd: (i, e, $row, name) => {
            console.log(`Employee added at index: ${i}`);

            // Initialize nested dynamic rows for this employee
            initializeNestedSections(i, $row);

            // Add custom validators for non-standard fields
            const $joinDate = $row.find(`[name="${name}[${i}][join_date]"]`);
            $('#multiForm').bootstrapValidator('addField', $joinDate, {
                validators: {
                    date: {
                        format: 'YYYY-MM-DD',
                        message: 'Date must be in YYYY-MM-DD format'
                    }
                }
            });

            // Set up change event for department
            $row.find(`[name="${name}[${i}][department]"]`).on('change', function() {
                console.log(`Department changed to: ${this.value} for employee ${i}`);
            });

            // Initialize datepicker if needed
            $joinDate.datepicker({
                format: 'yyyy-mm-dd',
                autoclose: true
            });
        },

        onRemove: (i, e, $row, name) => {
            console.log(`About to remove employee at index: ${i}`);

            // Custom pre-removal logic
            const hasContacts = $row.find('.contact-row').length > 0;
            if (hasContacts) {
                console.log('This employee has emergency contacts');
            }

            // Clean up nested plugin instances if needed
            $row.find('.contacts-wrap').data('remAddRow', null);
            $row.find('.dependents-wrap').data('remAddRow', null);
        }
    });

    // Function to initialize nested sections
    function initializeNestedSections(empIndex, $empRow) {
        const empId = `emp_${empIndex}`;

        // Initialize Emergency Contacts
        $(`#contacts_${empIndex}`).remAddRow({
            addBtn: `[data-emp-index="${empIndex}"].add-contact`,
            maxFields: 3,
            removeSelector: '.remove-contact',
            fieldName: `employees[${empIndex}][emergency_contacts]`,
            rowIdPrefix: `contact_${empIndex}`,
            reindexOnRemove: true,
            idField: `employees[${empIndex}][emergency_contacts][{index}][id]`,

            swal: {
                enabled: true,
                options: {
                    title: 'Delete Contact',
                    text: 'Are you sure you want to delete this emergency contact?',
                    icon: 'question',
                    confirmButtonText: 'Delete',
                    cancelButtonText: 'Keep'
                },
                ajax: {
                    url: '/api/contacts/{id}',
                    method: 'DELETE',
                    data: {
                        id: '{id}',
                        _token: $('meta[name="csrf-token"]').attr('content')
                    }
                }
            },

            validator: {
                enabled: true,
                form: '#multiForm',
                fields: {
                    [`employees[${empIndex}][emergency_contacts][{index}][name]`]: {
                        validators: {
                            notEmpty: {
                                message: 'Contact name is required'
                            }
                        }
                    },
                    [`employees[${empIndex}][emergency_contacts][{index}][phone]`]: {
                        validators: {
                            notEmpty: {
                                message: 'Phone number is required'
                            },
                            phone: {
                                country: 'US',
                                message: 'Please enter a valid phone number'
                            }
                        }
                    },
                    [`employees[${empIndex}][emergency_contacts][{index}][relationship]`]: {
                        validators: {
                            notEmpty: {
                                message: 'Relationship is required'
                            }
                        }
                    }
                }
            },

            rowTemplate: (j, contactName) => `
                <div id="contact_${empIndex}_${j}" class="contact-row row mb-2 p-2 bg-white border">
                    <input type="hidden"
                           name="${contactName}[${j}][id]"
                           value="">

                    <div class="col-sm-4">
                        <input type="text"
                               name="${contactName}[${j}][name]"
                               class="form-control form-control-sm"
                               placeholder="Contact Name">
                    </div>

                    <div class="col-sm-3">
                        <input type="tel"
                               name="${contactName}[${j}][phone]"
                               class="form-control form-control-sm"
                               placeholder="Phone Number">
                    </div>

                    <div class="col-sm-3">
                        <select name="${contactName}[${j}][relationship]"
                                class="form-select form-select-sm">
                            <option value="">Relationship</option>
                            <option value="spouse">Spouse</option>
                            <option value="parent">Parent</option>
                            <option value="sibling">Sibling</option>
                            <option value="friend">Friend</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div class="col-sm-2">
                        <button type="button"
                                class="btn btn-outline-danger btn-sm remove-contact"
                                data-id="${j}">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `,

            onAdd: (j, e, $contactRow, name) => {
                console.log(`Contact ${j} added for employee ${empIndex}`);

                // Auto-format phone number
                $contactRow.find('[type="tel"]').inputmask('(999) 999-9999');
            },

            onRemove: (j, e, $contactRow, name) => {
                console.log(`Contact ${j} removed from employee ${empIndex}`);
            }
        });

        // Initialize Dependents
        $(`#dependents_${empIndex}`).remAddRow({
            addBtn: `[data-emp-index="${empIndex}"].add-dependent`,
            maxFields: 5,
            removeSelector: '.remove-dependent',
            fieldName: `employees[${empIndex}][dependents]`,
            rowIdPrefix: `dependent_${empIndex}`,
            reindexOnRemove: true,

            swal: {
                enabled: false  // No SweetAlert2 for dependents
            },

            validator: {
                enabled: true,
                form: '#multiForm',
                fields: {
                    [`employees[${empIndex}][dependents][{index}][name]`]: {
                        validators: {
                            notEmpty: {
                                message: 'Dependent name is required'
                            }
                        }
                    },
                    [`employees[${empIndex}][dependents][{index}][age]`]: {
                        validators: {
                            notEmpty: {
                                message: 'Age is required'
                            },
                            between: {
                                min: 0,
                                max: 25,
                                message: 'Age must be between 0 and 25'
                            }
                        }
                    }
                }
            },

            rowTemplate: (k, dependentName) => `
                <div id="dependent_${empIndex}_${k}" class="dependent-row row mb-2 p-2 bg-white border">
                    <div class="col-sm-5">
                        <input type="text"
                               name="${dependentName}[${k}][name]"
                               class="form-control form-control-sm"
                               placeholder="Dependent Name">
                    </div>

                    <div class="col-sm-3">
                        <input type="number"
                               name="${dependentName}[${k}][age]"
                               class="form-control form-control-sm"
                               min="0" max="25"
                               placeholder="Age">
                    </div>

                    <div class="col-sm-3">
                        <select name="${dependentName}[${k}][relationship]"
                                class="form-select form-select-sm">
                            <option value="child">Child</option>
                            <option value="spouse">Spouse</option>
                            <option value="parent">Parent</option>
                        </select>
                    </div>

                    <div class="col-sm-1">
                        <button type="button"
                                class="btn btn-outline-danger btn-sm remove-dependent"
                                data-id="${k}">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `,

            onAdd: (k, e, $dependentRow, name) => {
                console.log(`Dependent ${k} added for employee ${empIndex}`);

                // Auto-calculate year of birth based on employee's join date?
                const $joinDate = $empRow.find(`[name="employees[${empIndex}][join_date]"]`);
                if ($joinDate.val()) {
                    // Could add logic here
                }
            }
        });
    }

    // Global event handlers
    $(document).on('change', '[name$="[department]"]', function() {
        const dept = $(this).val();
        const $row = $(this).closest('.employee-row');

        // Show/hide fields based on department
        if (dept === 'IT') {
            $row.find('.it-specialty').removeClass('d-none');
        } else {
            $row.find('.it-specialty').addClass('d-none');
        }
    });

    // Form submission handling
    $('#multiForm').on('submit', function(e) {
        if (!$(this).data('bootstrapValidator').validate().isValid()) {
            e.preventDefault();

            // Scroll to first error
            const $firstError = $('.has-error').first();
            if ($firstError.length) {
                $('html, body').animate({
                    scrollTop: $firstError.offset().top - 100
                }, 500);
            }

            return false;
        }

        // Collect all data for debugging/confirmation
        const formData = $(this).serializeArray();
        console.log('Submitting data:', formData);

        // Optional: Show loading
        $(this).find('button[type="submit"]')
            .prop('disabled', true)
            .html('<i class="fas fa-spinner fa-spin"></i> Saving...');
    });
});
```

------------------------------------------------------------------------

## 🔌 Callbacks

### onAdd

``` js
onAdd: (index, event, $row, name) => {
  console.log('Added', index);
}
```

### onRemove

``` js
onRemove: (index, event, $row, name) => {
  console.log('Removing', index);
  // event.preventDefault(); // cancel removal
}
```

------------------------------------------------------------------------

## ⚠️ Notes

-   SweetAlert2 must be globally available:

``` js
window.swal = swal;
```

-   BootstrapValidator is deprecated but supported (then use mine ;D)
-   Plugin auto reindexes safely after any removal

------------------------------------------------------------------------

## 📄 License

MIT

------------------------------------------------------------------------

## ❤️ Credits

Built for real-world Laravel + jQuery applications.
