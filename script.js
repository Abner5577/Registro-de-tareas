// script.js (VERSIÓN 3)

// ** IMPORTANTE: Reemplaza esta URL con la URL de tu Google Apps Script Web App **
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxRX6upyayl1Rj9C2aNhaWPq8sxEd0q5ruO-bPvaFxe8eAbvU-eRRPAvfBZ3oQYT7zNKA/exec'; 


const formatDateForDisplay = (dateValue) => {
    if (!dateValue) return '';
    if (dateValue instanceof Date) {
        return dateValue.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    const date = new Date(dateValue);
    if (isNaN(date)) return dateValue; 
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const getFormattedDateForComparison = (dateValue) => {
    if (!dateValue) return '';
    let date;
    if (dateValue instanceof Date) {
        date = dateValue;
    } else {
        date = new Date(dateValue);
    }
    if (isNaN(date)) return dateValue; 
    
    // Usar la fecha local sin forzar UTC para evitar desplazamiento de un día
    // Esto es vital para que la comparación del filtro de fecha funcione correctamente.
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const createFormHTML = (task) => {
    // Aseguramos que el contenedor tenga un fondo blanco para html2canvas
    return `
        <div class="boleta-soporte-template" style="background-color: white;">
            <h2 style="text-align: center; color: #0B2A4A; font-family: 'Poppins', sans-serif;">Boleta de Soporte Técnico</h2>
            <hr style="border: 1px solid #fff531f9; margin-bottom: 15px;">
            
            <p><strong>Fila ID:</strong> ${task.rowIndex}</p>
            <p><strong>Fecha de Soporte:</strong> ${formatDateForDisplay(task.fechaAsignacion)}</p>
            <p><strong>Departamento:</strong> ${task.departamento}</p>
            <p><strong>Usuario Asignado:</strong> ${task.usuarioSoporte}</p>
            <br>
            <p><strong>Título de la Actividad:</strong> ${task.tituloActividad}</p>
            <p><strong>Descripción:</strong> ${task.descripcion || 'N/A'}</p>
            <p><strong>Estado:</strong> <span style="font-weight: bold; color: ${task.estado === 'Realizada' ? '#2ecc71' : '#e74c3c'};">${task.estado}</span></p>
            
            <br><br><br>
            <div style="text-align: center; margin-top: 30px;">
                <p>_________________________</p>
                <p>Firma del Técnico</p>
            </div>
        </div>
    `;
};

const handleGenerateAllForms = async () => {
    // allTasks sigue siendo accesible globalmente
    const tasksToGenerate = allTasks.filter(task => task.estado === 'Realizada'); 
    
    if (tasksToGenerate.length === 0) {
        alert("No hay tareas realizadas (Realizada) para generar el PDF consolidado. 📋"); 
        return;
    }

    const button = document.getElementById('generarTodasLasBoletas');
    button.disabled = true;
    button.textContent = 'Solicitando PDF al Servidor (Espere)...';

    try {
        // Nueva llamada al Apps Script con la acción 'generateAllForms'
        const response = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?action=generateAllForms`);
        const result = await response.json();

        if (result.status === 'success') {
            alert(`✅ PDF Consolidado creado con éxito y guardado en Drive.\nNombre del archivo: ${result.fileName}`);
            
            // Abrir el PDF generado por el servidor en una nueva pestaña
            if (result.fileUrl) {
                 window.open(result.fileUrl, '_blank');
            }
        } else {
            alert('❌ Error al generar el PDF consolidado: ' + (result.message || 'Error desconocido.'));
        }

    } catch (error) {
        console.error('Error de red al llamar a Apps Script:', error);
        alert('Hubo un problema de conexión de red al generar el PDF consolidado. 💥');
    } finally {
        button.disabled = false;
        button.textContent = 'Generar Todas las Boletas en PDF';
    }
};


// ------------------------------------------------------------------
// INICIO DEL DOMContentLoaded (Mantenemos la lógica principal de la UI)
// ------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    const tareaForm = document.getElementById('tareaForm');
    const menuIngresarTarea = document.getElementById('menu-ingresar-tarea');
    const menuVerTareas = document.getElementById('menu-ver-tareas');
    const formTareasSection = document.getElementById('form-tareas');
    const listaTareasSection = document.getElementById('lista-tareas');
    const filtroEstado = document.getElementById('filtroEstado');
    const filtroDepartamento = document.getElementById('filtroDepartamento');
    const filtroFecha = document.getElementById('filtroFecha');
    const limpiarFiltrosBtn = document.getElementById('limpiarFiltros');


    const showSection = (sectionToShow) => {
        formTareasSection.classList.remove('active');
        listaTareasSection.classList.remove('active');
        sectionToShow.classList.add('active');
    };

    const validateRequired = (value) => value.trim() !== '';
    validateRequired.message = 'Este campo es obligatorio.';

    const setupValidation = (inputElement, errorElementId, validationFn) => {
        const errorElement = document.getElementById(errorElementId);
        inputElement.addEventListener('input', () => {
            if (!validationFn(inputElement.value)) {
                inputElement.classList.add('invalid');
                errorElement.textContent = validationFn.message || 'Campo inválido.';
            } else {
                inputElement.classList.remove('invalid');
                errorElement.textContent = '';
            }
        });
    };

    setupValidation(document.getElementById('fechaAsignacion'), 'errorFechaAsignacion', validateRequired);
    setupValidation(document.getElementById('tituloActividad'), 'errorTituloActividad', validateRequired);
    setupValidation(document.getElementById('departamento'), 'errorDepartamento', validateRequired);
    setupValidation(document.getElementById('usuarioSoporte'), 'errorUsuarioSoporte', validateRequired);

    // --- Manejo del envío del formulario (Registrar Tarea) ---
    if (tareaForm) {
        tareaForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const fechaAsignacion = document.getElementById('fechaAsignacion');
            const tituloActividad = document.getElementById('tituloActividad');
            const descripcion = document.getElementById('descripcion');
            const departamento = document.getElementById('departamento');
            const usuarioSoporte = document.getElementById('usuarioSoporte');

            let isValid = true;
            if (!validateRequired(fechaAsignacion.value)) { isValid = false; fechaAsignacion.classList.add('invalid'); document.getElementById('errorFechaAsignacion').textContent = validateRequired.message; } else { fechaAsignacion.classList.remove('invalid'); document.getElementById('errorFechaAsignacion').textContent = ''; }
            if (!validateRequired(tituloActividad.value)) { isValid = false; tituloActividad.classList.add('invalid'); document.getElementById('errorTituloActividad').textContent = validateRequired.message; } else { tituloActividad.classList.remove('invalid'); document.getElementById('errorTituloActividad').textContent = ''; }
            if (!validateRequired(departamento.value)) { isValid = false; departamento.classList.add('invalid'); document.getElementById('errorDepartamento').textContent = validateRequired.message; } else { departamento.classList.remove('invalid'); document.getElementById('errorDepartamento').textContent = ''; }
            if (!validateRequired(usuarioSoporte.value)) { isValid = false; usuarioSoporte.classList.add('invalid'); document.getElementById('errorUsuarioSoporte').textContent = validateRequired.message; } else { usuarioSoporte.classList.remove('invalid'); document.getElementById('errorUsuarioSoporte').textContent = ''; }

            if (!isValid) {
                alert('Por favor, rellena todos los campos obligatorios antes de guardar. 🔍');
                return;
            }

            const formData = new FormData();
            formData.append('action', 'saveTask'); 
            formData.append('fechaAsignacion', fechaAsignacion.value);
            formData.append('tituloActividad', tituloActividad.value);
            formData.append('descripcion', descripcion.value);
            formData.append('departamento', departamento.value);
            formData.append('usuarioSoporte', usuarioSoporte.value);

            try {
                alert('Guardando tarea ⌛... Por favor, espera.');
                const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
                    method: 'POST',
                    body: formData,
                });
                const result = await response.json();

                if (result.status === 'success') {
                    alert('¡Tarea guardada con éxito! 🥳🎉 Puedes visualizarla en Ver tareas 📒');
                    tareaForm.reset();
                    document.getElementById('errorFechaAsignacion').textContent = '';
                    document.getElementById('errorTituloActividad').textContent = '';
                    document.getElementById('errorDepartamento').textContent = '';
                    document.getElementById('errorUsuarioSoporte').textContent = '';
                    if (listaTareasSection.classList.contains('active')) {
                        await fetchAndDisplayTasks();
                    }
                } else {
                    alert('Error al guardar la tarea: 😣' + result.message);
                }
            } catch (error) {
                console.error('Error al enviar los datos:', error);
                alert('Hubo un problema de conexión al guardar la tarea 😣. Inténtalo de nuevo. 🔄');
            }
        });
    }

    // --- Funciones para "Ver Tareas" ---
    
    // Función para renderizar las tareas 
    const renderTasks = (tasksToRender) => {
        const tablaBody = document.querySelector('#tablaTareas tbody');
        const mensajeCarga = document.getElementById('mensaje-carga');
        
        tablaBody.innerHTML = '';

        if (tasksToRender.length === 0) {
            mensajeCarga.textContent = 'No hay tareas que coincidan con los filtros aplicados.';
            mensajeCarga.style.display = 'block';
            tablaBody.innerHTML = '<tr><td colspan="7" class="sin-registros">No se encontraron tareas con los filtros aplicados.</td></tr>';
            document.getElementById('tablaTareas').style.display = 'table'; 
            return;
        }

        mensajeCarga.style.display = 'none';
        document.getElementById('tablaTareas').style.display = 'table'; 

        tasksToRender.forEach(task => {
            const fila = document.createElement('tr');
            if (task.estado === 'Realizada') {
                fila.classList.add('realizada');
            }

            // Nota: Aquí se usa la función global formatDateForDisplay
            fila.innerHTML = `
                <td>${task.tituloActividad}</td>
                <td>${task.descripcion || 'N/A'}</td>
                <td>${formatDateForDisplay(task.fechaAsignacion)}</td>
                <td>${task.departamento}</td>
                <td>${task.usuarioSoporte}</td>
                <td class="estado-${task.estado}">
                    <span class="estado-tarea">${task.estado}</span>
                </td>
            `;
            
            // Crea una celda para los botones de acción
            const actionCell = document.createElement('td');
            actionCell.classList.add('task-actions-cell');
            
            // Crea los botones y los añade a la celda
            // Si la tarea está Pendiente, agrega el botón de "Marcar Realizada"
            if (task.estado === 'Pendiente') {
                const markDoneButton = document.createElement('button');
                markDoneButton.textContent = 'Marcar Realizada';
                markDoneButton.classList.add('marcar-realizada');
                markDoneButton.dataset.rowIndex = task.rowIndex;
                markDoneButton.addEventListener('click', handleMarkAsCompleted);
                actionCell.appendChild(markDoneButton);
            }
            
            // Botón de "Generar Boleta"
            const generateFormButton = document.createElement('button');
            generateFormButton.textContent = 'Generar Boleta';
            generateFormButton.classList.add('generar-boleta');
            generateFormButton.dataset.rowIndex = task.rowIndex;
            generateFormButton.addEventListener('click', handleGenerateForm);
            actionCell.appendChild(generateFormButton);
            
            fila.appendChild(actionCell);
            tablaBody.appendChild(fila);
        });
    };

    // --- Generar Boleta de Soporte (Unidad) ---
    const handleGenerateForm = async (e) => {
        const button = e.target;
        const rowIndex = button.dataset.rowIndex;

        if (confirm('¿Estás seguro de que quieres generar la boleta de soporte para esta tarea?')) {
            button.disabled = true;
            button.textContent = 'Generando...';

            try {
                const response = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?action=generateForm&rowIndex=${rowIndex}`);
                const result = await response.json();

                if (result.status === 'success') {
                    alert('Boleta generada con éxito. Abriendo en una nueva pestaña...');
                    window.open(result.pdfUrl, '_blank');
                } else {
                    alert('Error al generar la boleta: ' + result.message);
                }
            } catch (error) {
                console.error('Error de red al generar la boleta:', error);
                alert('Hubo un problema de conexión al generar la boleta.');
            } finally {
                button.disabled = false; 
                button.textContent = 'Generar Boleta';
            }
        }
    };


    // Función para obtener y mostrar las tareas
    const fetchAndDisplayTasks = async () => {
        const mensajeCarga = document.getElementById('mensaje-carga');
        const tablaTareas = document.getElementById('tablaTareas');

        mensajeCarga.textContent = 'Cargando tareas...';
        mensajeCarga.style.display = 'block';
        if (tablaTareas) {
            tablaTareas.style.display = 'none';
        }
        
        try {
            const response = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?action=getTasks`);
            const result = await response.json();

            if (result.status === 'success') {
                allTasks = result.tasks.map(task => { 
                    if (task.fechaAsignacion) {
                        task.fechaAsignacion = getFormattedDateForComparison(task.fechaAsignacion);
                    }
                    // IMPORTANTE: Si Apps Script no devuelve un estado, se lo asignamos.
                    // Esto ayuda a solucionar el problema de la columna "undefined"
                    if (!task.estado) {
                         task.estado = 'Pendiente'; 
                    }
                    return task;
                });
                applyFiltersAndRender();
            } else {
                mensajeCarga.textContent = `Error al cargar tareas: ${result.message}`;
                mensajeCarga.style.color = getComputedStyle(document.documentElement).getPropertyValue('--color-secundario-accion');
                console.error('Error al cargar tareas:', result.message);
            }
        } catch (error) {
            mensajeCarga.textContent = 'Hubo un problema de conexión al cargar las tareas.';
            mensajeCarga.style.color = getComputedStyle(document.documentElement).getPropertyValue('--color-secundario-accion');
            console.error('Error de red al cargar tareas:', error);
        }
    };

    // Función para obtener y popular los departamentos en el filtro
    const fetchDepartments = async () => {
        try {
            const response = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?action=getDepartments`);
            const result = await response.json();

            if (result.status === 'success') {
                uniqueDepartments = result.departments; // Usa la variable global
                populateDepartmentFilter();
            } else {
                console.error('Error al cargar departamentos:', result.message);
            }
        } catch (error) {
            console.error('Error de red al cargar departamentos:', error);
        }
    };

    const populateDepartmentFilter = () => {
        filtroDepartamento.innerHTML = '<option value="Todos">Todos</option>'; 
        uniqueDepartments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept;
            option.textContent = dept;
            filtroDepartamento.appendChild(option);
        });
    };


    // --- Manejo de filtros ---
    const applyFiltersAndRender = () => {
        let filteredTasks = [...allTasks]; 

        const estadoSeleccionado = filtroEstado.value;
        if (estadoSeleccionado !== 'Todas') {
            filteredTasks = filteredTasks.filter(task => task.estado === estadoSeleccionado);
        }

        const departamentoSeleccionado = filtroDepartamento.value;
        if (departamentoSeleccionado !== 'Todos') {
            filteredTasks = filteredTasks.filter(task => task.departamento === departamentoSeleccionado);
        }

        const fechaSeleccionada = filtroFecha.value; 
        if (fechaSeleccionada) {
            filteredTasks = filteredTasks.filter(task => {
                return task.fechaAsignacion === fechaSeleccionada;
            });
        }
        renderTasks(filteredTasks);
    };

    // Añadir event listeners a los filtros
    filtroEstado.addEventListener('change', applyFiltersAndRender);
    filtroDepartamento.addEventListener('change', applyFiltersAndRender);
    filtroFecha.addEventListener('change', applyFiltersAndRender);
    limpiarFiltrosBtn.addEventListener('click', () => {
        filtroEstado.value = 'Todas';
        filtroDepartamento.value = 'Todos';
        filtroFecha.value = '';
        applyFiltersAndRender(); 
    });

    // --- Marcar tarea como completada ---
    const handleMarkAsCompleted = async (e) => {
        const button = e.target;
        const rowIndex = button.dataset.rowIndex; 

        if (confirm('¿Estás seguro de que quieres marcar esta tarea como "Realizada"?')) {
            button.disabled = true;
            button.textContent = 'Actualizando...';

            const formData = new FormData();
            formData.append('action', 'updateTaskStatus'); 
            formData.append('rowIndex', rowIndex);
            formData.append('newStatus', 'Realizada');

            try {
                const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
                    method: 'POST',
                    body: formData,
                });
                const result = await response.json();

                if (result.status === 'success') {
                    alert('Tarea marcada como "Realizada" con éxito! ✅');
                    await fetchAndDisplayTasks();
                } else {
                    alert('Error al marcar tarea como realizada: ❌ ' + result.message);
                    button.disabled = false;
                    button.textContent = 'Marcar Realizada';
                }
            } catch (error) {
                console.error('Error de red al actualizar tarea:', error);
                alert('Hubo un problema de conexión al actualizar la tarea 😣. Inténtalo de nuevo. ');
                button.disabled = false;
                button.textContent = 'Marcar Realizada';
            }
        }
    };
    
    // --- CONEXIÓN DE BOTÓN GLOBAL DE PDF ---
    // Conecta el botón a la función handleGenerateAllForms (que es global)
    document.getElementById('generarTodasLasBoletas')?.addEventListener('click', handleGenerateAllForms);

    // --- Manejo de la navegación ---
    menuIngresarTarea.addEventListener('click', (e) => {
        e.preventDefault();
        showSection(formTareasSection);
        menuIngresarTarea.classList.add('active');
        menuVerTareas.classList.remove('active');
    });

    menuVerTareas.addEventListener('click', async (e) => {
        e.preventDefault();
        showSection(listaTareasSection);
        menuVerTareas.classList.add('active');
        menuIngresarTarea.classList.remove('active');
        await fetchDepartments(); 
        await fetchAndDisplayTasks(); 
    });

    // Inicializa la vista de "Registrar Tarea" al cargar la página
    showSection(formTareasSection);
});