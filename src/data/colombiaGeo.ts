// Colombian Geographic Data (Departments and Municipalities) for Dropi Logistics

export interface DepartmentInfo {
  name: string;
  code: string;
  cities: string[];
}

export const COLOMBIA_DEPARTMENTS: DepartmentInfo[] = [
  {
    name: 'Bogotá D.C.',
    code: '11',
    cities: ['Bogotá D.C.']
  },
  {
    name: 'Antioquia',
    code: '05',
    cities: ['Medellín', 'Bello', 'Itagüí', 'Envigado', 'Sabaneta', 'Rionegro', 'Apartadó', 'Turbo', 'Caucasia', 'Caldas', 'La Estrella', 'Copacabana', 'Marinilla', 'Guarne', 'La Ceja']
  },
  {
    name: 'Valle del Cauca',
    code: '76',
    cities: ['Cali', 'Palmira', 'Buenaventura', 'Tuluá', 'Cartago', 'Buga', 'Jamundí', 'Yumbo', 'Candelaria', 'Pradera', 'Florida', 'Zarzal', 'Sevilla']
  },
  {
    name: 'Cundinamarca',
    code: '25',
    cities: ['Soacha', 'Facatativá', 'Girardot', 'Zipaquirá', 'Chía', 'Fusagasugá', 'Mosquera', 'Madrid', 'Funza', 'Cajicá', 'Sibaté', 'Tocancipá', 'Cota', 'La Calera', 'Sopó']
  },
  {
    name: 'Atlántico',
    code: '08',
    cities: ['Barranquilla', 'Soledad', 'Malambo', 'Sabanalarga', 'Baranoa', 'Puerto Colombia', 'Galapa', 'Santo Tomás', 'Palmar de Varela']
  },
  {
    name: 'Santander',
    code: '68',
    cities: ['Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta', 'Barrancabermeja', 'San Gil', 'Socorro', 'Lebrija', 'Barbosa', 'Málaga']
  },
  {
    name: 'Bolívar',
    code: '13',
    cities: ['Cartagena', 'Magangué', 'El Carmen de Bolívar', 'Turbaco', 'Arjona', 'Mompós', 'Santa Rosa del Sur', 'San Juan Nepomuceno']
  },
  {
    name: 'Risaralda',
    code: '66',
    cities: ['Pereira', 'Dosquebradas', 'Santa Rosa de Cabal', 'La Virginia', 'Belén de Umbría', 'Santuario', 'Quinchía']
  },
  {
    name: 'Caldas',
    code: '17',
    cities: ['Manizales', 'Villamaría', 'Chinchiná', 'La Dorada', 'Riosucio', 'Anserma', 'Salamina', 'Pensilvania']
  },
  {
    name: 'Quindío',
    code: '63',
    cities: ['Armenia', 'Calarcá', 'La Tebaida', 'Montenegro', 'Quimbaya', 'Circasia', 'Filandia', 'Salento']
  },
  {
    name: 'Nariño',
    code: '52',
    cities: ['Pasto', 'Tumaco', 'Ipiales', 'Túquerres', 'La Unión', 'Samaniego', 'Sandoná']
  },
  {
    name: 'Tolima',
    code: '73',
    cities: ['Ibagué', 'Espinal', 'Melgar', 'Chaparral', 'Líbano', 'Mariquita', 'Honda', 'Flandes', 'Guamo', 'Purificación']
  },
  {
    name: 'Huila',
    code: '41',
    cities: ['Neiva', 'Pitalito', 'Garzón', 'La Plata', 'Campoalegre', 'San Agustín', 'Gigante', 'Palermo']
  },
  {
    name: 'Norte de Santander',
    code: '54',
    cities: ['Cúcuta', 'Ocaña', 'Villa del Rosario', 'Los Patios', 'Pamplona', 'Tibú', 'El Zulia', 'Chinácota']
  },
  {
    name: 'Meta',
    code: '50',
    cities: ['Villavicencio', 'Acacías', 'Granada', 'Puerto López', 'San Martín', 'Cumaral', 'Restrepo']
  },
  {
    name: 'Córdoba',
    code: '23',
    cities: ['Montería', 'Cereté', 'Lorica', 'Sahagún', 'Montelíbano', 'Planeta Rica', 'Tierralta', 'Ciénaga de Oro']
  },
  {
    name: 'Cesar',
    code: '20',
    cities: ['Valledupar', 'Aguachica', 'Agustín Codazzi', 'Bosconia', 'Curumaní', 'El Copey', 'La Paz']
  },
  {
    name: 'Magdalena',
    code: '47',
    cities: ['Santa Marta', 'Ciénaga', 'Fundación', 'Plato', 'El Banco', 'Aracataca', 'Pivijay']
  },
  {
    name: 'Boyacá',
    code: '15',
    cities: ['Tunja', 'Duitama', 'Sogamoso', 'Chiquinquirá', 'Puerto Boyacá', 'Paipa', 'Moniquirá', 'Villa de Leyva']
  },
  {
    name: 'Cauca',
    code: '19',
    cities: ['Popayán', 'Santander de Quilichao', 'Puerto Tejada', 'Patía', 'Piendamó', 'Bolívar']
  },
  {
    name: 'Sucre',
    code: '70',
    cities: ['Sincelejo', 'Corozal', 'San Marcos', 'San Onofre', 'Sampués', 'Tolú', 'Coveñas']
  },
  {
    name: 'La Guajira',
    code: '44',
    cities: ['Riohacha', 'Maicao', 'Uribia', 'Manaure', 'San Juan del Cesar', 'Fonseca', 'Villanueva']
  },
  {
    name: 'Casanare',
    code: '85',
    cities: ['Yopal', 'Aguazul', 'Villanueva', 'Tauramena', 'Paz de Ariporo', 'Monterrey']
  },
  {
    name: 'Caquetá',
    code: '18',
    cities: ['Florencia', 'San Vicente del Caguán', 'Cartagena del Chairá', 'Puerto Rico']
  },
  {
    name: 'Putumayo',
    code: '86',
    cities: ['Mocoa', 'Puerto Asís', 'Orito', 'Valle del Guamuez', 'Villagarzón']
  },
  {
    name: 'Chocó',
    code: '27',
    cities: ['Quibdó', 'Istmina', 'Tadó', 'Condoto', 'Bahía Solano']
  },
  {
    name: 'Arauca',
    code: '81',
    cities: ['Arauca', 'Tame', 'Saravena', 'Arauquita']
  },
  {
    name: 'San Andrés y Providencia',
    code: '88',
    cities: ['San Andrés', 'Providencia']
  },
  {
    name: 'Amazonas',
    code: '91',
    cities: ['Leticia', 'Puerto Nariño']
  },
  {
    name: 'Guaviare',
    code: '95',
    cities: ['San José del Guaviare', 'El Retorno', 'Calamar']
  },
  {
    name: 'Guainía',
    code: '94',
    cities: ['Inírida']
  },
  {
    name: 'Vaupés',
    code: '97',
    cities: ['Mitú']
  },
  {
    name: 'Vichada',
    code: '99',
    cities: ['Puerto Carreño', 'La Primavera', 'Cumaribo', 'Santa Rosalía']
  }
];

// Mapeo exhaustivo de Códigos DANE oficiales de Colombia para integración con Dropi
export const DANE_CODES: Record<string, string> = {
  // Principales Capitales y Áreas Metropolitanas
  'bogotá d.c.': '11001',
  'bogota': '11001',
  'bogotá': '11001',
  'medellín': '05001',
  'medellin': '05001',
  'bello': '05088',
  'itagüí': '05360',
  'itagui': '05360',
  'envigado': '05266',
  'sabaneta': '05631',
  'rionegro': '05615',
  'apartadó': '05045',
  'apartado': '05045',
  'cali': '76001',
  'palmira': '76520',
  'buenaventura': '76109',
  'tuluá': '76834',
  'tulua': '76834',
  'cartago': '76147',
  'buga': '76111',
  'jamundí': '76364',
  'jamundi': '76364',
  'yumbo': '76892',
  'barranquilla': '08001',
  'soledad': '08758',
  'malambo': '08433',
  'puerto colombia': '08573',
  'bucaramanga': '68001',
  'floridablanca': '68276',
  'girón': '68307',
  'giron': '68307',
  'piedecuesta': '68547',
  'barrancabermeja': '68081',
  'cartagena': '13001',
  'magangué': '13430',
  'magangue': '13430',
  'turbaco': '13836',
  'cúcuta': '54001',
  'cucuta': '54001',
  'villa del rosario': '54874',
  'los patios': '54405',
  'ocaña': '54498',
  'ocana': '54498',
  'pereira': '66001',
  'dosquebradas': '66170',
  'santa rosa de cabal': '66682',
  'manizales': '17001',
  'villamaría': '17873',
  'villamaria': '17873',
  'chinchiná': '17174',
  'chinchina': '17174',
  'la dorada': '17380',
  'ibagué': '73001',
  'ibague': '73001',
  'espinal': '73268',
  'melgar': '73449',
  'neiva': '41001',
  'pitalito': '41551',
  'garzón': '41298',
  'garzon': '41298',
  'villavicencio': '50001',
  'acacías': '50006',
  'acacias': '50006',
  'granada': '50313',
  'armenia': '63001',
  'calarcá': '63130',
  'calarca': '63130',
  'la tebaida': '63401',
  'montenegro': '63470',
  'quimbaya': '63594',
  'montería': '23001',
  'monteria': '23001',
  'cereté': '23162',
  'cerete': '23162',
  'lorica': '23417',
  'sahagún': '23660',
  'sahagun': '23660',
  'valledupar': '20001',
  'aguachica': '20011',
  'santa marta': '47001',
  'ciénaga': '47189',
  'cienaga': '47189',
  'pasto': '52001',
  'tumaco': '52835',
  'ipiales': '52356',
  'popayán': '19001',
  'popayan': '19001',
  'santander de quilichao': '19698',
  'sincelejo': '70001',
  'corozal': '70215',
  'tunja': '15001',
  'duitama': '15238',
  'sogamoso': '15759',
  'chiquinquirá': '15176',
  'chiquinquira': '15176',
  'riohacha': '44001',
  'maicao': '44430',
  'florencia': '18001',
  'quibdó': '27001',
  'quibdo': '27001',
  'yopal': '85001',
  'mocoa': '86001',
  'puerto asís': '86568',
  'puerto asis': '86568',
  'san andrés': '88001',
  'san andres': '88001',
  'leticia': '91001',
  'arauca': '81001',
  'saravena': '81736',
  'tame': '81794',
  'san josé del guaviare': '95001',
  'san jose del guaviare': '95001',
  'inírida': '94001',
  'inirida': '94001',
  'mitú': '97001',
  'mitu': '97001',
  'puerto carreño': '99001',
  'puerto carreno': '99001',
  'soacha': '25754',
  'chía': '25175',
  'chia': '25175',
  'zipaquirá': '25899',
  'zipaquira': '25899',
  'facatativá': '25269',
  'facatativa': '25269',
  'fusagasugá': '25290',
  'fusagasuga': '25290',
  'mosquera': '25473',
  'madrid': '25430',
  'funza': '25286',
  'cajicá': '25126',
  'cajica': '25126',
  'girardot': '25307',
  'cota': '25214',
  'la calera': '25377',
  'sopó': '25758',
  'sopo': '25758',
  'tocancipá': '25817',
  'tocancipa': '25817'
};

/**
 * Obtiene el código DANE oficial para una ciudad y departamento de Colombia.
 * Usado para la sincronización con la API de Dropi Colombia.
 */
export function getDaneCode(cityName?: string, departmentName?: string): string {
  if (!cityName) return '11001';
  const cleanCity = cityName.trim().toLowerCase();
  
  if (DANE_CODES[cleanCity]) {
    return DANE_CODES[cleanCity];
  }

  // Si no está en el mapa directo, buscar en departamentos
  if (departmentName) {
    const dept = COLOMBIA_DEPARTMENTS.find(d => 
      d.name.toLowerCase() === departmentName.toLowerCase()
    );
    if (dept) {
      return `${dept.code}001`;
    }
  }

  return '11001'; // Default Bogotá D.C.
}

