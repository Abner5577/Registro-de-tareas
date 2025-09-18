// script.js

// ** IMPORTANTE: Reemplaza esta URL con la URL de tu Google Apps Script Web App **
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyJh_KuukdbsQpcAaFISXzs-bB4Jww1Pi6daXN2yBbJ68SbC4DRmOVaHQ6e2mIAEghk8g/exec'; 

document.addEventListener('DOMContentLoaded', () => {
    const tareaForm = document.getElementById('tareaForm');
    const menuIngresarTarea = document.getElementById('menu-ingresar-tarea');
    const menuVerTareas = document.getElementById('menu-ver-tareas');
    const formTareasSection = document.getElementById('form-tareas');
    const listaTareasSection = document.getElementById('lista-tareas');
    const contenedorTareas = document.getElementById('contenedorTareas');
    const filtroEstado = document.getElementById('filtroEstado');
    const filtroDepartamento = document.getElementById('filtroDepartamento');
    const filtroFecha = document.getElementById('filtroFecha');
    const limpiarFiltrosBtn = document.getElementById('limpiarFiltros');

    let allTasks = []; // Para almacenar todas las tareas cargadas desde Sheets
    let uniqueDepartments = []; // Para almacenar los departamentos únicos para el filtro

    // Función para manejar la visibilidad de las secciones
    const showSection = (sectionToShow) => {
        formTareasSection.classList.remove('active');
        listaTareasSection.classList.remove('active');
        sectionToShow.classList.add('active');
    };

    // Función para validar campos requeridos (reutilizable)
    const validateRequired = (value) => value.trim() !== '';
    validateRequired.message = 'Este campo es obligatorio.';

    // Setup de validaciones en tiempo real para el formulario de ingreso
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
            // Re-validar todos los campos al enviar
            if (!validateRequired(fechaAsignacion.value)) { isValid = false; fechaAsignacion.classList.add('invalid'); document.getElementById('errorFechaAsignacion').textContent = validateRequired.message; } else { fechaAsignacion.classList.remove('invalid'); document.getElementById('errorFechaAsignacion').textContent = ''; }
            if (!validateRequired(tituloActividad.value)) { isValid = false; tituloActividad.classList.add('invalid'); document.getElementById('errorTituloActividad').textContent = validateRequired.message; } else { tituloActividad.classList.remove('invalid'); document.getElementById('errorTituloActividad').textContent = ''; }
            if (!validateRequired(departamento.value)) { isValid = false; departamento.classList.add('invalid'); document.getElementById('errorDepartamento').textContent = validateRequired.message; } else { departamento.classList.remove('invalid'); document.getElementById('errorDepartamento').textContent = ''; }
            if (!validateRequired(usuarioSoporte.value)) { isValid = false; usuarioSoporte.classList.add('invalid'); document.getElementById('errorUsuarioSoporte').textContent = validateRequired.message; } else { usuarioSoporte.classList.remove('invalid'); document.getElementById('errorUsuarioSoporte').textContent = ''; }

            if (!isValid) {
                alert('Por favor, rellena todos los campos obligatorios antes de guardar. 🔍');
                return;
            }

            const formData = new FormData();
            formData.append('action', 'saveTask'); // Indicar la acción para Apps Script
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
                    // Limpiar mensajes de error
                    document.getElementById('errorFechaAsignacion').textContent = '';
                    document.getElementById('errorTituloActividad').textContent = '';
                    document.getElementById('errorDepartamento').textContent = '';
                    document.getElementById('errorUsuarioSoporte').textContent = '';
                    // También, si estamos en la vista de tareas, recargar para ver la nueva
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

    // Formatear fecha para visualización (solo para mostrar, no para comparar)
    const formatDateForDisplay = (dateValue) => {
        if (!dateValue) return '';
        // Si dateValue viene como objeto Date (de Apps Script timestamp)
        if (dateValue instanceof Date) {
            return dateValue.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
        // Si viene como string (de input date o de Sheets como string YYYY-MM-DD)
        const date = new Date(dateValue);
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    // Función auxiliar para obtener la fecha en formato YYYY-MM-DD
    const getFormattedDateForComparison = (dateValue) => {
        if (!dateValue) return '';
        let date;
        if (dateValue instanceof Date) {
            date = dateValue;
        } else {
            // Asume que dateValue es una string 'YYYY-MM-DD' o similar
            date = new Date(dateValue);
        }
        // Ajusta la fecha a la zona horaria UTC para evitar problemas con la hora local
        // y obtener un formato consistente YYYY-MM-DD
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };


    /*// Reemplaza tu función renderTasks() con esta nueva versión (ACTUALIZADA)
const renderTasks = (tasksToRender) => {
    // Apunta al tbody de la nueva tabla
    const tablaBody = document.querySelector('#tablaTareas tbody');
    const mensajeCarga = document.getElementById('mensaje-carga');
    
    // Limpiar el cuerpo de la tabla antes de agregar las nuevas filas
    tablaBody.innerHTML = '';

    if (tasksToRender.length === 0) {
        mensajeCarga.textContent = 'No hay tareas que coincidan con los filtros aplicados.';
        mensajeCarga.style.display = 'block';
        // Opcional: ocultar la tabla si no hay datos
        document.getElementById('tablaTareas').style.display = 'none'; 
        return;
    }

    mensajeCarga.style.display = 'none';
    document.getElementById('tablaTareas').style.display = 'table'; // Asegurar que la tabla es visible

    tasksToRender.forEach(task => {
        const fila = document.createElement('tr');
        if (task.estado === 'Realizada') {
            fila.classList.add('realizada');
        }

        // Mapea los datos del objeto 'task' a las celdas de la tabla (td)
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
        if (task.estado === 'Pendiente') {
            const markDoneButton = document.createElement('button');
            markDoneButton.textContent = 'Marcar Realizada';
            markDoneButton.classList.add('marcar-realizada');
            markDoneButton.dataset.rowIndex = task.rowIndex;
            markDoneButton.addEventListener('click', handleMarkAsCompleted);
            actionCell.appendChild(markDoneButton);
        }
        
        const generateFormButton = document.createElement('button');
        generateFormButton.textContent = 'Generar Boleta';
        generateFormButton.classList.add('generar-boleta');
        generateFormButton.dataset.rowIndex = task.rowIndex;
        generateFormButton.addEventListener('click', handleGenerateForm);
        actionCell.appendChild(generateFormButton);
        
        fila.appendChild(actionCell);

        tablaBody.appendChild(fila);
    });
};*/
//------------Versión actualizada-----------------------------------
const renderTasks = (tasksToRender) => {
    // Apunta al tbody de la nueva tabla
    const tablaBody = document.querySelector('#tablaTareas tbody');
    const mensajeCarga = document.getElementById('mensaje-carga');
    
    // Limpiar el cuerpo de la tabla antes de agregar las nuevas filas
    tablaBody.innerHTML = '';

    if (tasksToRender.length === 0) {
        mensajeCarga.textContent = 'No hay tareas que coincidan con los filtros aplicados.';
        mensajeCarga.style.display = 'block';
        document.getElementById('tablaTareas').style.display = 'none'; 
        return;
    }

    mensajeCarga.style.display = 'none';
    document.getElementById('tablaTareas').style.display = 'table'; 

    tasksToRender.forEach(task => {
        const fila = document.createElement('tr');
        if (task.estado === 'Realizada') {
            fila.classList.add('realizada');
        }

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
        
        // Siempre agrega el botón de "Generar Boleta"
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

    // --- Generar Boleta de Soporte ---
const handleGenerateForm = async (e) => {
    const button = e.target;
    const rowIndex = button.dataset.rowIndex;

    if (confirm('¿Estás seguro de que quieres generar la boleta de soporte para esta tarea?')) {
        button.disabled = true;
        button.textContent = 'Generando...';

        try {
            // Hacemos una solicitud GET con la acción 'generateForm' y el rowIndex
            const response = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?action=generateForm&rowIndex=${rowIndex}`);
            const result = await response.json();

            if (result.status === 'success') {
                alert('Boleta generada con éxito. Abriendo en una nueva pestaña...');
                // Abrir la URL del PDF en una nueva pestaña para que el usuario pueda ver/descargar/imprimir
                window.open(result.pdfUrl, '_blank');
                button.textContent = 'Boleta Generada'; // O 'Generar Boleta' de nuevo si quieres que se pueda regenerar
            } else {
                alert('Error al generar la boleta: ' + result.message);
                button.textContent = 'Generar Boleta';
            }
        } catch (error) {
            console.error('Error de red al generar la boleta:', error);
            alert('Hubo un problema de conexión al generar la boleta.');
            button.textContent = 'Generar Boleta';
        } finally {
            button.disabled = false; // Re-habilitar el botón
        }
    }
};

    // Función para obtener y mostrar las tareas
    /*const fetchAndDisplayTasks = async () => {
        contenedorTareas.innerHTML = '<p>Cargando tareas...</p>'; // Mensaje de carga
        try {
            const response = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?action=getTasks`); // Solicitar las tareas
            const result = await response.json();

            if (result.status === 'success') {
                // allTasks = result.tasks; // No es necesario re-asignar aquí si solo se usa en applyFiltersAndRender
                // Ajustar el formato de fecha para todas las tareas inmediatamente después de la carga
                allTasks = result.tasks.map(task => {
                    if (task.fechaAsignacion) {
                        // Apps Script devuelve fechas como objetos Date si son válidas.
                        // Convierte a YYYY-MM-DD si aún no lo está para comparación consistente.
                        // Si Apps Script ya devuelve string 'YYYY-MM-DD', esto también funciona.
                        task.fechaAsignacion = getFormattedDateForComparison(task.fechaAsignacion);
                    }
                    return task;
                });
                applyFiltersAndRender(); // Aplicar filtros y renderizar
            } else {
                contenedorTareas.innerHTML = `<p style="color: ${getComputedStyle(document.documentElement).getPropertyValue('--color-secundario-accion')}">Error al cargar tareas: ${result.message}</p>`;
                console.error('Error al cargar tareas:', result.message);
            }
        } catch (error) {
            contenedorTareas.innerHTML = `<p style="color: ${getComputedStyle(document.documentElement).getPropertyValue('--color-secundario-accion')}">Hubo un problema de conexión al cargar las tareas.</p>`;
            console.error('Error de red al cargar tareas:', error);
        }
    };*/

    //NUEVA FUNCIÓN---------------------------------------------------
    const fetchAndDisplayTasks = async () => {
    // Apunta al nuevo elemento de mensaje de carga
    const mensajeCarga = document.getElementById('mensaje-carga');
    const tablaTareas = document.getElementById('tablaTareas');

    mensajeCarga.textContent = 'Cargando tareas...'; // Mostrar mensaje de carga
    mensajeCarga.style.display = 'block';
    if (tablaTareas) {
        tablaTareas.style.display = 'none'; // Oculta la tabla mientras carga
    }
    
    try {
        const response = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?action=getTasks`);
        const result = await response.json();

        if (result.status === 'success') {
            allTasks = result.tasks.map(task => {
                if (task.fechaAsignacion) {
                    task.fechaAsignacion = getFormattedDateForComparison(task.fechaAsignacion);
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
                uniqueDepartments = result.departments;
                populateDepartmentFilter();
            } else {
                console.error('Error al cargar departamentos:', result.message);
            }
        } catch (error) {
            console.error('Error de red al cargar departamentos:', error);
        }
    };

    const populateDepartmentFilter = () => {
        filtroDepartamento.innerHTML = '<option value="Todos">Todos</option>'; // Restablecer
        uniqueDepartments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept;
            option.textContent = dept;
            filtroDepartamento.appendChild(option);
        });
    };


    // --- Manejo de filtros ---
    const applyFiltersAndRender = () => {
        let filteredTasks = [...allTasks]; // Copia de las tareas para filtrar

        // Filtrar por estado
        const estadoSeleccionado = filtroEstado.value;
        if (estadoSeleccionado !== 'Todas') {
            filteredTasks = filteredTasks.filter(task => task.estado === estadoSeleccionado);
        }

        // Filtrar por departamento
        const departamentoSeleccionado = filtroDepartamento.value;
        if (departamentoSeleccionado !== 'Todos') {
            filteredTasks = filteredTasks.filter(task => task.departamento === departamentoSeleccionado);
        }

        // Filtrar por fecha
        const fechaSeleccionada = filtroFecha.value; // Ya viene en YYYY-MM-DD
        if (fechaSeleccionada) {
            filteredTasks = filteredTasks.filter(task => {
                // Comparamos el formato YYYY-MM-DD de la tarea con la fecha seleccionada
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
        applyFiltersAndRender(); // Volver a aplicar filtros con valores por defecto
    });

    // --- Marcar tarea como completada ---
    const handleMarkAsCompleted = async (e) => {
        const button = e.target;
        const rowIndex = button.dataset.rowIndex; // Obtener el número de fila

        if (confirm('¿Estás seguro de que quieres marcar esta tarea como "Realizada"?')) {
            button.disabled = true; // Deshabilita el botón para evitar clics múltiples
            button.textContent = 'Actualizando...';

            const formData = new FormData();
            formData.append('action', 'updateTaskStatus'); // Indicar la acción
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
                    // *** Importante: Recargar todas las tareas para sincronizar el estado ***
                    await fetchAndDisplayTasks();
                    // Los filtros actuales se re-aplicarán automáticamente con la nueva carga
                } else {
                    alert('Error al marcar tarea como realizada: ❌ ' + result.message);
                    button.disabled = false; // Re-habilita el botón si hay error
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
        await fetchDepartments(); // Carga departamentos antes de tareas
        await fetchAndDisplayTasks(); // Carga y muestra las tareas
    });

    // Inicializa la vista de "Registrar Tarea" al cargar la página
    showSection(formTareasSection);
});