/**
 * Script de Importación y Validación de Empleados
 * Analiza, valida, estandariza y carga datos a Firebase
 * 
 * Ejecutar: node import-employees.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, Timestamp, getDocs, query, where } from 'firebase/firestore';
import { readFileSync, writeFileSync } from 'fs';

// Configuración Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBeaxgsJG60gD1yj2_zuDgavnzS1Qyeg1g",
  authDomain: "capacitacion-33413.firebaseapp.com",
  projectId: "capacitacion-33413",
  storageBucket: "capacitacion-33413.firebasestorage.app",
  messagingSenderId: "87624642907",
  appId: "1:87624642907:web:4de9e4e637052770da2a7e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// =============================================
// CONFIGURACIÓN Y MAPEOS
// =============================================

// Mapeo de turnos numéricos a texto
const TURNO_MAP = {
  1: 'Primer Turno',
  2: 'Segundo Turno',
  3: 'Tercer Turno',
  4: 'Cuarto Turno',
  5: 'Turno Mixto',
  '1': 'Primer Turno',
  '2': 'Segundo Turno',
  '3': 'Tercer Turno',
  '4': 'Cuarto Turno',
  '5': 'Turno Mixto'
};

// Correcciones ortográficas comunes
const CORRECCIONES_ORTOGRAFICAS = {
  // Departamentos
  'PRODUCCION': 'PRODUCCIÓN',
  'CALIAD': 'CALIDAD',
  'LOGISTICA': 'LOGÍSTICA',
  'METROLOGIA': 'METROLOGÍA',

  // Áreas
  'ADMINISTRATIVO': 'ADMINISTRATIVO',

  // Acentos en nombres
  'MARIA': 'MARÍA',
  'JOSE': 'JOSÉ',
  'CONCEPCION': 'CONCEPCIÓN',
  'SOFIA': 'SOFÍA',

  // Apellidos comunes
  'RODRIGUEZ': 'RODRÍGUEZ',
  'VAZQUEZ': 'VÁZQUEZ',
  'GARCIA': 'GARCÍA',
  'GONZALEZ': 'GONZÁLEZ',
  'HERNANDEZ': 'HERNÁNDEZ',
  'LOPEZ': 'LÓPEZ',
  'MARTINEZ': 'MARTÍNEZ',
  'PEREZ': 'PÉREZ',
  'SANCHEZ': 'SÁNCHEZ',
  'RAMIREZ': 'RAMÍREZ',
  'FERNANDEZ': 'FERNÁNDEZ',
  'JIMENEZ': 'JIMÉNEZ',
  'GUTIERREZ': 'GUTIÉRREZ',
  'DIAZ': 'DÍAZ',
  'MUÑOZ': 'MUÑOZ'
};

// Días para calcular fin de contrato (89 días según política)
const DIAS_CONTRATO = 89;

// =============================================
// FUNCIONES DE UTILIDAD
// =============================================

/**
 * Convierte texto a formato Title Case con acentos
 */
function toTitleCase(str) {
  if (!str) return '';
  return str.toLowerCase().split(' ').map(word => {
    if (word.length === 0) return '';
    // Palabras que deben permanecer en minúscula
    const minusculas = ['de', 'del', 'la', 'las', 'los', 'el', 'y'];
    if (minusculas.includes(word)) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}

/**
 * Aplica correcciones ortográficas
 */
function corregirOrtografia(texto) {
  if (!texto) return '';
  let corregido = texto.toUpperCase();

  // Aplicar correcciones palabra por palabra
  const palabras = corregido.split(/\s+/);
  const palabrasCorregidas = palabras.map(palabra => {
    return CORRECCIONES_ORTOGRAFICAS[palabra] || palabra;
  });

  return palabrasCorregidas.join(' ');
}

/**
 * Parsea fecha en varios formatos
 */
function parsearFecha(fechaStr) {
  if (!fechaStr) return null;

  // Limpiar la cadena
  let fecha = fechaStr.replace(/\\/g, '/').trim();

  // Formato MM/DD/YYYY o M/D/YYYY
  const partes = fecha.split('/');
  if (partes.length === 3) {
    let [mes, dia, año] = partes.map(p => parseInt(p, 10));

    // Validar rangos
    if (mes < 1 || mes > 12) return null;
    if (dia < 1 || dia > 31) return null;
    if (año < 2020 || año > 2030) return null;

    return new Date(año, mes - 1, dia);
  }

  return null;
}

/**
 * Calcula fecha de fin de contrato
 */
function calcularFinContrato(fechaIngreso, dias = DIAS_CONTRATO) {
  if (!fechaIngreso) return null;
  const fin = new Date(fechaIngreso);
  fin.setDate(fin.getDate() + dias);
  return fin;
}

/**
 * Formatea nombre completo: APELLIDO APELLIDO NOMBRE -> Título Case
 */
function formatearNombre(nombreCompleto) {
  if (!nombreCompleto) return '';

  // Primero corregir ortografía
  let nombre = corregirOrtografia(nombreCompleto);

  // Convertir a Title Case
  return toTitleCase(nombre);
}

/**
 * Estandariza el departamento
 */
function estandarizarDepartamento(depto) {
  if (!depto) return '';
  let d = corregirOrtografia(depto.trim().toUpperCase());
  return toTitleCase(d);
}

/**
 * Estandariza el área
 */
function estandarizarArea(area) {
  if (!area) return '';
  let a = corregirOrtografia(area.trim().toUpperCase());
  return toTitleCase(a);
}

/**
 * Estandariza el turno
 */
function estandarizarTurno(turno) {
  if (turno === null || turno === undefined) return 'Sin asignar';
  return TURNO_MAP[turno] || `Turno ${turno}`;
}

// =============================================
// VALIDACIÓN
// =============================================

/**
 * Valida un registro de empleado
 */
function validarEmpleado(emp, index) {
  const errores = [];
  const advertencias = [];

  // Validar campos requeridos
  if (!emp['No Empleado'] && emp['No Empleado'] !== 0) {
    errores.push(`Falta número de empleado`);
  }

  if (!emp['Nombre completo'] || emp['Nombre completo'].trim() === '') {
    errores.push(`Falta nombre completo`);
  }

  if (!emp['Fecha Ingreso']) {
    errores.push(`Falta fecha de ingreso`);
  } else {
    const fecha = parsearFecha(emp['Fecha Ingreso']);
    if (!fecha) {
      errores.push(`Fecha de ingreso inválida: ${emp['Fecha Ingreso']}`);
    }
  }

  // Advertencias (no bloquean)
  if (!emp['Departamento']) {
    advertencias.push(`Sin departamento asignado`);
  }

  if (!emp['Área']) {
    advertencias.push(`Sin área asignada`);
  }

  if (!emp['Turno'] && emp['Turno'] !== 0) {
    advertencias.push(`Sin turno asignado`);
  }

  // Verificar acentos faltantes en nombres
  const nombreOriginal = emp['Nombre completo'] || '';
  const nombreCorregido = corregirOrtografia(nombreOriginal);
  if (nombreOriginal.toUpperCase() !== nombreCorregido) {
    advertencias.push(`Ortografía corregida en nombre`);
  }

  return { errores, advertencias };
}

// =============================================
// TRANSFORMACIÓN
// =============================================

/**
 * Transforma un registro del JSON al formato de Firestore
 */
function transformarEmpleado(emp) {
  const fechaIngreso = parsearFecha(emp['Fecha Ingreso']);
  const fechaFinContrato = calcularFinContrato(fechaIngreso);

  return {
    employeeNumber: `EMP${String(emp['No Empleado']).padStart(4, '0')}`,
    originalEmployeeNumber: emp['No Empleado'],
    fullName: formatearNombre(emp['Nombre completo']),
    department: estandarizarDepartamento(emp['Departamento']),
    area: estandarizarArea(emp['Área']),
    position: toTitleCase(emp['Puesto'] || ''),
    shift: estandarizarTurno(emp['Turno']),
    shiftNumber: emp['Turno'],
    startDate: fechaIngreso ? Timestamp.fromDate(fechaIngreso) : null,
    contractEndDate: fechaFinContrato ? Timestamp.fromDate(fechaFinContrato) : null,
    status: 'active',
    formRGREC048Delivered: false,
    evaluations: {
      day30: { score: null, requiresFollowUp: false, notes: '', completedAt: null },
      day60: { score: null, requiresFollowUp: false, notes: '', completedAt: null },
      day75: { score: null, requiresFollowUp: false, notes: '', completedAt: null }
    },
    createdAt: Timestamp.now(),
    importedAt: Timestamp.now(),
    importSource: 'Libro1.json'
  };
}

// =============================================
// FUNCIONES PRINCIPALES
// =============================================

/**
 * Lee y parsea el archivo JSON
 */
function leerArchivo(ruta) {
  try {
    const contenido = readFileSync(ruta, 'utf8');
    return JSON.parse(contenido);
  } catch (error) {
    console.error(`❌ Error al leer archivo: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Verifica si el empleado ya existe en Firebase
 */
async function empleadoExiste(employeeNumber) {
  const q = query(
    collection(db, 'employees'),
    where('originalEmployeeNumber', '==', employeeNumber)
  );
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

/**
 * Proceso principal
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  IMPORTADOR DE EMPLEADOS - Gestión de Contratos');
  console.log('═══════════════════════════════════════════════════════\n');

  // 1. Leer archivo
  console.log('📁 Leyendo archivo Libro1.json...');
  const datos = leerArchivo('./Libro1.json');
  console.log(`   ✓ ${datos.length} registros encontrados\n`);

  // 2. Validar datos
  console.log('🔍 Validando datos...');
  const resultados = {
    validos: [],
    conErrores: [],
    conAdvertencias: []
  };

  datos.forEach((emp, index) => {
    const { errores, advertencias } = validarEmpleado(emp, index);

    if (errores.length > 0) {
      resultados.conErrores.push({ registro: index + 1, empleado: emp, errores });
    } else {
      resultados.validos.push(emp);
      if (advertencias.length > 0) {
        resultados.conAdvertencias.push({ registro: index + 1, empleado: emp, advertencias });
      }
    }
  });

  console.log(`   ✓ ${resultados.validos.length} registros válidos`);
  console.log(`   ⚠ ${resultados.conAdvertencias.length} registros con advertencias`);
  console.log(`   ❌ ${resultados.conErrores.length} registros con errores\n`);

  // Mostrar errores
  if (resultados.conErrores.length > 0) {
    console.log('❌ REGISTROS CON ERRORES (no se importarán):');
    resultados.conErrores.forEach(({ registro, empleado, errores }) => {
      console.log(`   Registro #${registro}: ${empleado['Nombre completo'] || 'Sin nombre'}`);
      errores.forEach(e => console.log(`      - ${e}`));
    });
    console.log('');
  }

  // Mostrar advertencias
  if (resultados.conAdvertencias.length > 0) {
    console.log('⚠ REGISTROS CON ADVERTENCIAS (se importarán con correcciones):');
    resultados.conAdvertencias.forEach(({ registro, empleado, advertencias }) => {
      console.log(`   Registro #${registro}: ${empleado['Nombre completo']}`);
      advertencias.forEach(a => console.log(`      - ${a}`));
    });
    console.log('');
  }

  // 3. Transformar datos
  console.log('🔄 Transformando datos...');
  const empleadosTransformados = resultados.validos.map(transformarEmpleado);

  // Mostrar preview de transformación
  console.log('\n📋 PREVIEW DE DATOS TRANSFORMADOS:');
  console.log('─────────────────────────────────────────────────────────');
  empleadosTransformados.slice(0, 3).forEach(emp => {
    console.log(`   ${emp.employeeNumber} | ${emp.fullName}`);
    console.log(`      Depto: ${emp.department} | Área: ${emp.area}`);
    console.log(`      Turno: ${emp.shift}`);
    console.log(`      Ingreso: ${emp.startDate?.toDate().toLocaleDateString('es-MX')}`);
    console.log(`      Fin contrato: ${emp.contractEndDate?.toDate().toLocaleDateString('es-MX')}`);
    console.log('');
  });
  if (empleadosTransformados.length > 3) {
    console.log(`   ... y ${empleadosTransformados.length - 3} más\n`);
  }

  // 4. Cargar a Firebase
  console.log('☁️ Cargando a Firebase...');
  let importados = 0;
  let duplicados = 0;
  let erroresFirebase = 0;

  for (const emp of empleadosTransformados) {
    try {
      // Verificar si ya existe
      const existe = await empleadoExiste(emp.originalEmployeeNumber);

      if (existe) {
        console.log(`   ⏭ ${emp.employeeNumber} ya existe, omitiendo...`);
        duplicados++;
        continue;
      }

      // Crear documento con ID único
      const docId = `emp_${emp.originalEmployeeNumber}_${Date.now()}`;
      await setDoc(doc(db, 'employees', docId), emp);
      console.log(`   ✓ ${emp.employeeNumber} - ${emp.fullName}`);
      importados++;

    } catch (error) {
      console.log(`   ❌ Error con ${emp.employeeNumber}: ${error.message}`);
      erroresFirebase++;
    }
  }

  // 5. Resumen final
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  RESUMEN DE IMPORTACIÓN');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`   📊 Total en archivo:     ${datos.length}`);
  console.log(`   ✓ Importados:           ${importados}`);
  console.log(`   ⏭ Duplicados omitidos:  ${duplicados}`);
  console.log(`   ❌ Errores validación:   ${resultados.conErrores.length}`);
  console.log(`   ❌ Errores Firebase:     ${erroresFirebase}`);
  console.log('═══════════════════════════════════════════════════════\n');

  // Guardar reporte
  const reporte = {
    fecha: new Date().toISOString(),
    archivo: 'Libro1.json',
    totalRegistros: datos.length,
    importados,
    duplicados,
    erroresValidacion: resultados.conErrores,
    advertencias: resultados.conAdvertencias
  };

  writeFileSync('./import-report.json', JSON.stringify(reporte, null, 2));
  console.log('📄 Reporte guardado en: import-report.json\n');

  process.exit(0);
}

// Ejecutar
main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
