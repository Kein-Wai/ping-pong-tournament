import { PrismaClient, TypeUser } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const BYE_USER_ID = '00000000-0000-0000-0000-000000000000';
const TBD_USER_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

const EQUIPOS = [
  { name: 'Bufanuvols', category: '2ª Autonómica G1 (FTTCV)', level: 'Intermedio' },
  { name: 'Tombatossals', category: '1ª Autonómica G1 (FTTCV)', level: 'Intermedio' },
  { name: 'Arrancapins', category: '1ª Autonómica G1 (FTTCV)', level: 'Intermedio' },
  { name: 'Castelló Ape', category: '1ª División Masc. G5 (RFETM)', level: 'Profesional' },
  { name: 'Castalia', category: '2ª División Masc. G6 (RFETM)', level: 'Avanzado' },
];

const PARTIDOS = [
  {
    equipo: 'Tombatossals',
    fecha: '2026-09-26T17:00:00',
    isHome: true,
    rival: 'Arrancapins (equipo del club)',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Castalia',
    fecha: '2026-09-27T11:00:00',
    isHome: false,
    rival: 'CTM Alcoy-Vintage',
    location: 'Alcoy',
  },
  {
    equipo: 'Arrancapins',
    fecha: '2026-10-03T17:00:00',
    isHome: true,
    rival: 'CD Pobla Farnals - Escola',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Bufanuvols',
    fecha: '2026-10-03T17:00:00',
    isHome: true,
    rival: 'STMO Estrellas',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Castalia',
    fecha: '2026-10-03T17:00:00',
    isHome: false,
    rival: "Alicante TM 'A'",
    location: 'Alicante',
  },
  {
    equipo: 'Castelló Ape',
    fecha: '2026-10-03T17:00:00',
    isHome: false,
    rival: 'Óptica Look Dama de Elche',
    location: 'Elche',
  },
  {
    equipo: 'Tombatossals',
    fecha: '2026-10-03T17:00:00',
    isHome: true,
    rival: 'CTT Mediterráneo',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Castalia',
    fecha: '2026-10-18T11:00:00',
    isHome: true,
    rival: 'CTM Elda',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Castelló Ape',
    fecha: '2026-10-18T11:00:00',
    isHome: true,
    rival: 'Murprotec Alcobendas TM',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Castelló Ape',
    fecha: '2026-10-24T10:30:00',
    isHome: true,
    rival: 'Marsenses - Inca TTC',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Arrancapins',
    fecha: '2026-10-24T17:00:00',
    isHome: false,
    rival: 'CTT Pobla Vallbona',
    location: 'Polideportivo Municipal, La Pobla de Vallbona',
  },
  {
    equipo: 'Tombatossals',
    fecha: '2026-10-24T17:00:00',
    isHome: false,
    rival: 'CD Pobla Farnals - Escola',
    location: "Pabellón del IES Guillem d'Alcalà, C/ Immaculada 14, La Pobla de Farnals",
  },
  {
    equipo: 'Bufanuvols',
    fecha: '2026-10-25T10:30:00',
    isHome: false,
    rival: 'CTT El Ratón La Vall B',
    location: "CEIP Ausiàs March, Av. Sud-Oest 13, La Vall d'Uixó",
  },
  {
    equipo: 'Castalia',
    fecha: '2026-10-25T11:00:00',
    isHome: true,
    rival: 'CTT Alzira Camarena',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Arrancapins',
    fecha: '2026-10-31T17:00:00',
    isHome: true,
    rival: 'AST',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Bufanuvols',
    fecha: '2026-10-31T17:00:00',
    isHome: true,
    rival: 'AST/Iniciación',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Tombatossals',
    fecha: '2026-10-31T17:00:00',
    isHome: true,
    rival: 'CTT Pobla Vallbona',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Castalia',
    fecha: '2026-11-01T11:00:00',
    isHome: false,
    rival: 'CTT Miralbo Xàbia',
    location: 'Xàbia',
  },
  {
    equipo: 'Castelló Ape',
    fecha: '2026-11-07T11:00:00',
    isHome: false,
    rival: 'Noroeste - Las Rozas',
    location: 'Las Rozas (Madrid)',
  },
  {
    equipo: 'Arrancapins',
    fecha: '2026-11-07T17:00:00',
    isHome: false,
    rival: 'CTT La Nau B',
    location: 'Palau Velodrom Lluís Puig, C/ Cocentaina 4, Benimámet (Valencia)',
  },
  {
    equipo: 'Bufanuvols',
    fecha: '2026-11-07T17:00:00',
    isHome: false,
    rival: 'CTT La Nau C',
    location: 'Palau Velòdrom Lluís Puig, C/ Cocentaina 4. Benimámet (Valencia)',
  },
  {
    equipo: 'Castelló Ape',
    fecha: '2026-11-07T17:30:00',
    isHome: false,
    rival: 'Cubes Norte TT',
    location: 'Madrid',
  },
  {
    equipo: 'Castelló Ape',
    fecha: '2026-11-08T10:00:00',
    isHome: false,
    rival: 'Aluche TM',
    location: 'Aluche (Madrid)',
  },
  {
    equipo: 'Castalia',
    fecha: '2026-11-08T11:00:00',
    isHome: true,
    rival: 'CTT Algemesí',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Tombatossals',
    fecha: '2026-11-08T11:00:00',
    isHome: false,
    rival: 'AST',
    location: 'Burjassot (Valencia)',
  },
  {
    equipo: 'Castelló Ape',
    fecha: '2026-11-14T10:30:00',
    isHome: true,
    rival: 'Son Cladera TTC',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Arrancapins',
    fecha: '2026-11-14T17:00:00',
    isHome: true,
    rival: 'Requena Spin B',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Bufanuvols',
    fecha: '2026-11-14T17:00:00',
    isHome: true,
    rival: 'CDTM Rebote',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Tombatossals',
    fecha: '2026-11-14T17:00:00',
    isHome: true,
    rival: 'CTT La Nau B',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Tombatossals',
    fecha: '2026-11-21T17:00:00',
    isHome: false,
    rival: 'Requena Spin B',
    location: 'Pabellón Polideportivo Municipal, C/ Albacete s/n, Requena',
  },
  {
    equipo: 'Arrancapins',
    fecha: '2026-11-22T11:00:00',
    isHome: false,
    rival: 'CD Valencia TM B',
    location: 'Pabellón, Av. dels Germans Maristes 16, Valencia',
  },
  {
    equipo: 'Bufanuvols',
    fecha: '2026-11-22T11:00:00',
    isHome: false,
    rival: 'CD Valencia TM E',
    location: 'Pabellón, Av. dels Germans Maristes 16, Valencia',
  },
  {
    equipo: 'Castalia',
    fecha: '2026-11-22T11:00:00',
    isHome: true,
    rival: 'CTT Santísimo Salvador',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Castelló Ape',
    fecha: '2026-11-22T11:00:00',
    isHome: true,
    rival: 'Fuenlabrada Team TM Ammerländer',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Castelló Ape',
    fecha: '2026-11-28T10:30:00',
    isHome: true,
    rival: 'Boadilla Teresa Berganza-Drago TT',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Castalia',
    fecha: '2026-11-29T10:00:00',
    isHome: false,
    rival: 'Balkanica TT Xàtiva',
    location: 'Xàtiva',
  },
  {
    equipo: 'Castelló Ape',
    fecha: '2026-12-12T16:30:00',
    isHome: false,
    rival: 'Viajes Tanit - Portmany',
    location: 'Sant Antoni de Portmany (Ibiza.)',
  },
  {
    equipo: 'Arrancapins',
    fecha: '2026-12-12T17:00:00',
    isHome: true,
    rival: 'Santísimo Onda A',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Bufanuvols',
    fecha: '2026-12-12T17:00:00',
    isHome: true,
    rival: 'Morvedre - Recambios Vives',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Tombatossals',
    fecha: '2026-12-12T17:00:00',
    isHome: true,
    rival: 'CD Valencia TM B',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Castalia',
    fecha: '2026-12-13T10:00:00',
    isHome: false,
    rival: 'CTT La Vila Joiosa',
    location: 'La Vila Joiosa',
  },
  {
    equipo: 'Bufanuvols',
    fecha: '2027-01-09T17:00:00',
    isHome: false,
    rival: 'CTT La Nau D',
    location: 'Palau Velòdrom Lluís Puig, C/ Cocentaina 4, Benimȧmet (Valencia)',
  },
  {
    equipo: 'Tombatossals',
    fecha: '2027-01-09T17:00:00',
    isHome: false,
    rival: 'Santísimo Onda A',
    location: 'Espai Jove, C/ Aranyuel s/n, Onda',
  },
  {
    equipo: 'Arrancapins',
    fecha: '2027-01-10T11:00:00',
    isHome: false,
    rival: 'CTT Mediterráneo',
    location: 'Palau Velòdrom Lluís Puig, C/ Cocentaina 4, Benimàmet (Valencia)',
  },
  {
    equipo: 'Castalia',
    fecha: '2027-01-10T11:00:00',
    isHome: true,
    rival: 'CTT Corriol Oliva',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Castelló Ape',
    fecha: '2027-01-10T11:00:00',
    isHome: true,
    rival: 'CTT Corriol Oliva',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Castalia',
    fecha: '2027-01-17T11:00:00',
    isHome: true,
    rival: 'CTM Alcoy-Vintage',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Castelló Ape',
    fecha: '2027-01-17T11:00:00',
    isHome: true,
    rival: 'Viajes Tanit - Portmany',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Arrancapins',
    fecha: '2027-01-23T17:00:00',
    isHome: true,
    rival: 'Tombatossals (equipo del club)',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Castelló Ape',
    fecha: '2027-01-24T11:00:00',
    isHome: true,
    rival: 'Cubes Norte TT',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Arrancapins',
    fecha: '2027-01-30T17:00:00',
    isHome: false,
    rival: 'CD Pobla Farnals - Escola',
    location: "Pabellón del IES Guillem d'Alcalà, C/ Immaculada 14, La Pobla de Farnals",
  },
  {
    equipo: 'Bufanuvols',
    fecha: '2027-01-30T17:00:00',
    isHome: false,
    rival: 'STMO Estrellas',
    location: 'Espai Jove, C/ Aranyuel s/n, Onda',
  },
  {
    equipo: 'Castalia',
    fecha: '2027-01-31T11:00:00',
    isHome: true,
    rival: 'CTT Miralbo Xàbia',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Tombatossals',
    fecha: '2027-01-31T11:00:00',
    isHome: false,
    rival: 'CTT Mediterráneo',
    location: 'Palau Velodrom Lluis Puig, C/ Cocentaina 4, Benimåmet (Valencia)',
  },
  {
    equipo: 'Castelló Ape',
    fecha: '2027-02-20T11:00:00',
    isHome: false,
    rival: 'Boadilla Teresa Berganza-Drago TT',
    location: 'Boadilla del Monte (Madrid)',
  },
  {
    equipo: 'Arrancapins',
    fecha: '2027-02-20T17:00:00',
    isHome: true,
    rival: 'CTT Pobla Vallbona',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Bufanuvols',
    fecha: '2027-02-20T17:00:00',
    isHome: true,
    rival: 'CTT El Ratón La Vall B',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Tombatossals',
    fecha: '2027-02-20T17:00:00',
    isHome: true,
    rival: 'CD Pobla Farnals - Escola',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Castelló Ape',
    fecha: '2027-02-20T18:00:00',
    isHome: false,
    rival: 'Murprotec Alcobendas TM',
    location: 'Alcobendas (Madrid)',
  },
  {
    equipo: 'Castalia',
    fecha: '2027-02-21T11:00:00',
    isHome: true,
    rival: 'Balkanica TT Xàtiva',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Castelló Ape',
    fecha: '2027-02-21T11:00:00',
    isHome: false,
    rival: 'Fuenlabrada Team TM Ammerländer',
    location: 'Fuenlabrada (Madrid)',
  },
  {
    equipo: 'Castalia',
    fecha: '2027-03-06T17:00:00',
    isHome: false,
    rival: 'CTT Algemesí',
    location: 'Algemesí',
  },
  {
    equipo: 'Tombatossals',
    fecha: '2027-03-06T17:00:00',
    isHome: false,
    rival: 'CTT Pobla Vallbona',
    location: 'Polideportivo Municipal, La Pobla de Vallbona',
  },
  {
    equipo: 'Arrancapins',
    fecha: '2027-03-07T11:00:00',
    isHome: false,
    rival: 'AST',
    location: 'Burjassot (Valencia)',
  },
  {
    equipo: 'Bufanuvols',
    fecha: '2027-03-07T11:00:00',
    isHome: false,
    rival: 'AST/Iniciación',
    location: 'Burjassot (Valencia)',
  },
  {
    equipo: 'Castelló Ape',
    fecha: '2027-03-07T11:00:00',
    isHome: true,
    rival: 'Noroeste - Las Rozas',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Castalia',
    fecha: '2027-03-14T11:00:00',
    isHome: true,
    rival: "Alicante TM 'A'",
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Arrancapins',
    fecha: '2027-03-20T17:00:00',
    isHome: true,
    rival: 'CTT La Nau B',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Bufanuvols',
    fecha: '2027-03-20T17:00:00',
    isHome: true,
    rival: 'CTT La Nau C',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Tombatossals',
    fecha: '2027-03-20T17:00:00',
    isHome: true,
    rival: 'AST',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Bufanuvols',
    fecha: '2027-04-03T11:00:00',
    isHome: false,
    rival: 'CDTM Rebote',
    location: "Polideportivo Internúcleos, Av. de l'Advocat Fausto Caruana s/n, Sagunto",
  },
  {
    equipo: 'Arrancapins',
    fecha: '2027-04-03T17:00:00',
    isHome: false,
    rival: 'Requena Spin B',
    location: 'Pabellón Polideportivo Municipal, C/ Albacete s/n, Requena',
  },
  {
    equipo: 'Tombatossals',
    fecha: '2027-04-03T17:00:00',
    isHome: false,
    rival: 'CTT La Nau B',
    location: 'Palau Velòdrom Lluís Puig, C/ Cocentaina 4, Benimȧmet (Valencia)',
  },
  {
    equipo: 'Castelló Ape',
    fecha: '2027-04-03T17:30:00',
    isHome: false,
    rival: 'Marsenses - Inca TTC',
    location: 'Inca (Mallorca)',
  },
  {
    equipo: 'Castalia',
    fecha: '2027-04-04T10:00:00',
    isHome: false,
    rival: 'CTM Elda',
    location: 'Elda',
  },
  {
    equipo: 'Castelló Ape',
    fecha: '2027-04-04T10:30:00',
    isHome: false,
    rival: 'Son Cladera TTC',
    location: 'Son Cladera (Mallorca)',
  },
  {
    equipo: 'Castelló Ape',
    fecha: '2027-04-10T10:30:00',
    isHome: true,
    rival: 'Aluche TM',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Arrancapins',
    fecha: '2027-04-10T17:00:00',
    isHome: true,
    rival: 'CD Valencia TM B',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Bufanuvols',
    fecha: '2027-04-10T17:00:00',
    isHome: true,
    rival: 'CD Valencia TM E',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Castalia',
    fecha: '2027-04-10T17:00:00',
    isHome: false,
    rival: 'CTT Santísimo Salvador',
    location: 'Por confirmar',
  },
  {
    equipo: 'Tombatossals',
    fecha: '2027-04-10T17:00:00',
    isHome: true,
    rival: 'Requena Spin B',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Castalia',
    fecha: '2027-04-25T11:00:00',
    isHome: true,
    rival: 'CTT La Vila Joiosa',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Castelló Ape',
    fecha: '2027-04-25T11:00:00',
    isHome: true,
    rival: 'Óptica Look Dama de Elche',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Castalia',
    fecha: '2027-05-01T16:00:00',
    isHome: false,
    rival: 'CTT Alzira Camarena',
    location: 'Alzira',
  },
  {
    equipo: 'Arrancapins',
    fecha: '2027-05-01T17:00:00',
    isHome: false,
    rival: 'Santísimo Onda A',
    location: 'Espai Jove, C/ Aranyuel s/n, Onda',
  },
  {
    equipo: 'Bufanuvols',
    fecha: '2027-05-02T10:00:00',
    isHome: false,
    rival: 'Morvedre - Recambios Vives',
    location: "Polideportivo Internúcleos, Av. de l'Advocat Fausto Caruana s/n, Sagunto",
  },
  {
    equipo: 'Tombatossals',
    fecha: '2027-05-02T11:00:00',
    isHome: false,
    rival: 'CD Valencia TM B',
    location: 'Pabellón, Av. dels Germans Maristes 16, Valencia',
  },
  {
    equipo: 'Castelló Ape',
    fecha: '2027-05-08T16:00:00',
    isHome: false,
    rival: 'CTT Corriol Oliva',
    location: 'Oliva (Valencia)',
  },
  {
    equipo: 'Arrancapins',
    fecha: '2027-05-08T17:00:00',
    isHome: true,
    rival: 'CTT Mediterráneo',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Bufanuvols',
    fecha: '2027-05-08T17:00:00',
    isHome: true,
    rival: 'CTT La Nau D',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Tombatossals',
    fecha: '2027-05-08T17:00:00',
    isHome: true,
    rival: 'Santísimo Onda A',
    location: 'Pabellón Ciudad Deportiva Castellón',
  },
  {
    equipo: 'Castalia',
    fecha: '2027-05-09T10:00:00',
    isHome: false,
    rival: 'CTT Corriol Oliva',
    location: 'Oliva (Valencia)',
  },
];

const EVENTOS = [
  {
    name: 'Jocs Esportius - Liga Disc. Int. 1',
    date: '2026-10-03T09:00:00',
    region: 'Provincial',
    color: 'orange',
  },
  {
    name: 'Autonómico - Top 16 Abs.',
    date: '2026-10-09T09:00:00',
    region: 'Autonomico',
    color: 'blue',
  },
  {
    name: 'Nacional - Cto. España Selecciones Veteranos',
    date: '2026-10-10T09:00:00',
    endDate: '2026-10-11T09:00:00',
    region: 'Nacional',
    color: 'red',
  },
  {
    name: 'Nacional - I Spain Masters',
    date: '2026-10-12T09:00:00',
    endDate: '2026-10-13T09:00:00',
    region: 'Nacional',
    color: 'red',
  },
  {
    name: 'Nacional - Campeonato de España Inclusivo',
    date: '2026-10-14T09:00:00',
    endDate: '2026-10-16T09:00:00',
    region: 'Nacional',
    color: 'red',
  },
  {
    name: 'Jocs Esportius - 1er Top Prov.',
    date: '2026-10-17T09:00:00',
    region: 'Provincial',
    color: 'orange',
  },
  {
    name: 'Jocs Esportius - Veteranos 1',
    date: '2026-10-18T09:00:00',
    region: 'Provincial',
    color: 'orange',
  },
  {
    name: 'Jocs Esportius - 2º Top Prov.',
    date: '2026-11-07T09:00:00',
    region: 'Provincial',
    color: 'orange',
  },
  {
    name: 'Jocs Esportius - 3er Top Prov.',
    date: '2026-11-28T09:00:00',
    region: 'Provincial',
    color: 'orange',
  },
  {
    name: 'Jocs Esportius - Veteranos 2',
    date: '2026-11-29T09:00:00',
    region: 'Provincial',
    color: 'orange',
  },
  {
    name: 'Autonómico - Aut. Ind. y Dob. Cat. Inf. y Vet. Clas. Est. Sen. Disc.',
    date: '2026-12-05T09:00:00',
    endDate: '2026-12-06T09:00:00',
    region: 'Autonomico',
    color: 'blue',
  },
  {
    name: 'Jocs Esportius - Liga Disc. Int. 2',
    date: '2026-12-12T09:00:00',
    region: 'Provincial',
    color: 'orange',
  },
  {
    name: 'Autonómico - Cto. Autonómico Absoluto Equipos',
    date: '2026-12-19T09:00:00',
    region: 'Autonomico',
    color: 'blue',
  },
  {
    name: 'Jocs Esportius - 4º Top Prov.',
    date: '2027-01-16T09:00:00',
    region: 'Provincial',
    color: 'orange',
  },
  {
    name: 'Jocs Esportius - Veteranos 3',
    date: '2027-01-17T09:00:00',
    region: 'Provincial',
    color: 'orange',
  },
  {
    name: 'Jocs Esportius - Liga Disc. Int. 3',
    date: '2027-01-23T09:00:00',
    region: 'Provincial',
    color: 'orange',
  },
  {
    name: 'Jocs Esportius - Final Prov.',
    date: '2027-01-30T09:00:00',
    region: 'Provincial',
    color: 'orange',
  },
  {
    name: 'Nacional - Estatal S21, Sen, Vet y Disc.',
    date: '2027-02-05T09:00:00',
    endDate: '2027-02-07T09:00:00',
    region: 'Nacional',
    color: 'red',
  },
  {
    name: 'Jocs Esportius - 1er Top Aut.',
    date: '2027-02-06T09:00:00',
    region: 'Autonomico',
    color: 'orange',
  },
  {
    name: 'Nacional - Cto. España Absoluto',
    date: '2027-02-08T09:00:00',
    endDate: '2027-02-09T09:00:00',
    region: 'Nacional',
    color: 'red',
  },
  {
    name: 'Nacional - Copas SSMM Reyes',
    date: '2027-02-10T09:00:00',
    endDate: '2027-02-11T09:00:00',
    region: 'Nacional',
    color: 'red',
  },
  {
    name: 'Nacional - Estatal Ben, Ale, Inf y Juv',
    date: '2027-02-12T09:00:00',
    endDate: '2027-02-14T09:00:00',
    region: 'Nacional',
    color: 'red',
  },
  {
    name: 'Jocs Esportius - Final Aut.',
    date: '2027-02-27T09:00:00',
    region: 'Provincial',
    color: 'orange',
  },
  {
    name: 'Jocs Esportius - Veteranos 4',
    date: '2027-02-28T09:00:00',
    region: 'Provincial',
    color: 'orange',
  },
  {
    name: 'Jocs Esportius - Fin. Liga Disc. Int.',
    date: '2027-03-06T09:00:00',
    region: 'Provincial',
    color: 'orange',
  },
  {
    name: 'Jocs Esportius - Promesas 5',
    date: '2027-03-13T09:00:00',
    region: 'Provincial',
    color: 'orange',
  },
  {
    name: 'Jocs Esportius - Veteranos 5',
    date: '2027-03-14T09:00:00',
    region: 'Provincial',
    color: 'orange',
  },
  {
    name: 'Nacional - Top Estatal Jóvenes',
    date: '2027-03-19T09:00:00',
    endDate: '2027-03-20T09:00:00',
    region: 'Nacional',
    color: 'red',
  },
  {
    name: 'Nacional - Cto. España Parkinson',
    date: '2027-03-21T09:00:00',
    endDate: '2027-03-22T09:00:00',
    region: 'Nacional',
    color: 'red',
  },
  {
    name: 'Nacional - III Spain Másters',
    date: '2027-03-23T09:00:00',
    endDate: '2027-03-24T09:00:00',
    region: 'Nacional',
    color: 'red',
  },
  {
    name: 'Nacional - Cto. España Selecciones Autonómicas Escolar',
    date: '2027-03-25T09:00:00',
    endDate: '2027-03-28T09:00:00',
    region: 'Nacional',
    color: 'red',
  },
  {
    name: 'Autonómico - Cto. Aut. Equipos Cat. Inf. y Vet.',
    date: '2027-04-17T09:00:00',
    region: 'Autonomico',
    color: 'blue',
  },
  {
    name: 'Jocs Esportius - Promesas 6',
    date: '2027-04-24T09:00:00',
    region: 'Provincial',
    color: 'orange',
  },
  {
    name: 'Jocs Esportius - Veteranos 6',
    date: '2027-04-25T09:00:00',
    region: 'Provincial',
    color: 'orange',
  },
  {
    name: 'Autonómico - Cto. Aut. Disc. Int.',
    date: '2027-05-08T09:00:00',
    region: 'Autonomico',
    color: 'blue',
  },
  {
    name: 'Autonómico - Pre-Aut. Ind.',
    date: '2027-05-15T09:00:00',
    region: 'Autonomico',
    color: 'blue',
  },
  {
    name: 'Autonómico - Cto. Aut. Abs. Ind. Dob. D. Fís. Par.',
    date: '2027-05-22T09:00:00',
    region: 'Autonomico',
    color: 'blue',
  },
  {
    name: 'Jocs Esportius - Final Prom. y Vet.',
    date: '2027-05-30T09:00:00',
    region: 'Provincial',
    color: 'orange',
  },
  {
    name: 'Nacional - Campeonatos de España todas las categorías',
    date: '2027-06-19T09:00:00',
    endDate: '2027-07-04T09:00:00',
    region: 'Nacional',
    color: 'red',
  },
];

const schedulesCTM = [
  { name: 'L-X-V Iniciacion', startTime: '17:30', endTime: '19:00', daysOfWeek: [1, 3, 5] },
  { name: 'M-J Iniciacion', startTime: '17:30', endTime: '19:00', daysOfWeek: [2, 4] },
  { name: 'M-V Veteranos', startTime: '10:30', endTime: '12:30', daysOfWeek: [2, 5] },
  { name: 'L-X Federados', startTime: '19:00', endTime: '21:00', daysOfWeek: [1, 3] },
  { name: 'M-J Federados', startTime: '19:00', endTime: '21:00', daysOfWeek: [2, 4] },
];

async function main() {
  // console.log('🧹 Limpiando base de datos...');
  // await prisma.generalTrainingAttendance.deleteMany();
  // await prisma.playerSkillUpdate.deleteMany();
  // await prisma.generalTraining.deleteMany();
  // await prisma.skillUpdateTemplate.deleteMany();
  // await prisma.generalTrainingSchedule.deleteMany();

  // await prisma.match.deleteMany();
  // await prisma.tournamentKnockout.deleteMany();
  // await prisma.tournamentParticipant.deleteMany();
  // await prisma.tournamentClas.deleteMany();
  // await prisma.tournamentGroupClas.deleteMany();
  // await prisma.tournamentGroup.deleteMany();
  // await prisma.tournament.deleteMany();

  // await prisma.stats.deleteMany();
  // await prisma.user.deleteMany();
  // await prisma.season.deleteMany();
  // await prisma.club.deleteMany();

  // await prisma.sessionExercise.deleteMany();
  // await prisma.trainingSession.deleteMany();
  // await prisma.playerTraining.deleteMany();
  // await prisma.exercise.deleteMany();

  console.log('🌱 Iniciando Seed CTM Costa Azahar...');

  // 1. ROLES DE USUARIO
  // const types = [
  //   { name: TypeUser.SuperAdmin },
  //   { name: TypeUser.AdminClub },
  //   { name: TypeUser.Player },
  // ];
  // let savedTypes = [];
  // for (const type of types) {
  //   savedTypes.push(
  //     await prisma.userType.upsert({ where: { name: type.name }, update: {}, create: type }),
  //   );
  // }
  // const superAdminRoleId = savedTypes[0].id;
  // const adminClubRoleId = savedTypes[1].id;
  // const playerRoleId = savedTypes[2].id;

  const adminClubRoleId = await prisma.userType.findFirst({
    where: { name: TypeUser.AdminClub },
  });
  const currentSeason = await prisma.season.findFirst({
    where: { name: 'Temporada 2026/2027' },
  });

  // // 2. TEMPORADA ÚNICA (2026/2027)
  // console.log('📅 Generando Temporada...');
  // const currentSeason = await prisma.season.create({
  //   data: {
  //     name: 'Temporada 2026/2027',
  //     startDate: new Date('2026-08-01T00:00:00Z'),
  //     endDate: new Date('2027-07-31T23:59:59Z'),
  //     isCurrent: true,
  //   },
  // });

  console.log('🏢 Generando Club Principal...');
  const club = await prisma.club.create({
    data: {
      name: 'CTM Costa Azahar',
      status: 'Aprobado',
      city: 'Castellon de la Plana',
      logoUrl:
        'https://i0.wp.com/relevoparalimpico.wordpress.com/wp-content/uploads/2019/04/logo-definitivo-ctm-costa-azahar.jpg?fit=1110%2C1200&ssl=1&w=640',
      foundedAt: '2016-09-01T09:00:00Z',
    },
  });

  console.log('👑 Generando Administrador del Club...');
  const hashedPasswordd = await bcrypt.hash('Juli@nV@lentin@@tene@2026', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'julianlevin@hotmail.com',
      name: 'Julian',
      surname: 'Levin',
      userTypeId: adminClubRoleId?.id as string,
      password: hashedPasswordd,
      clubId: club.id,
      clubStatus: 'Aprobado',
      authProvider: 'LOCAL',
      active: true,
    },
  });

  // 4. ADMINISTRADOR GLOBAL
  // const hashedPassword = await bcrypt.hash('112233cheung', 10);
  // await prisma.user.create({
  //   data: {
  //     email: 'keinwaisuperadmin@hotmail.com',
  //     name: 'Kein-Wai',
  //     surname: 'Cheung',
  //     nickname: 'SuperAdmin',
  //     userTypeId: superAdminRoleId,
  //     password: hashedPassword,
  //     authProvider: 'LOCAL',
  //     active: true,
  //   },
  // });

  // 5. USUARIOS DEL SISTEMA (EXENTO Y TBD)
  // await prisma.user.upsert({
  //   where: { id: BYE_USER_ID },
  //   update: {},
  //   create: {
  //     id: BYE_USER_ID,
  //     email: 'exento@torneo.local',
  //     name: 'EXENTO',
  //     surname: '(Pasa de ronda)',
  //     userTypeId: playerRoleId,
  //     active: true,
  //   },
  // });

  // await prisma.user.upsert({
  //   where: { id: TBD_USER_ID },
  //   update: {},
  //   create: {
  //     id: TBD_USER_ID,
  //     email: 'tbd@torneo.local',
  //     name: 'Por',
  //     surname: 'Determinar',
  //     userTypeId: playerRoleId,
  //     active: true,
  //   },
  // });

  console.log('🛡️ Generando Equipos...');
  const dbTeams: Record<string, string> = {};
  for (const eq of EQUIPOS) {
    const created = await prisma.team.create({
      data: {
        name: eq.name,
        category: eq.category,
        level: eq.level,
        clubId: club.id,
        seasonId: currentSeason?.id as string,
      },
    });
    dbTeams[eq.name] = created.id;
  }

  console.log('🏓 Generando Partidos de Equipos...');
  for (const match of PARTIDOS) {
    await prisma.teamMatch.create({
      data: {
        teamId: dbTeams[match.equipo],
        rivalName: match.rival,
        date: new Date(match.fecha),
        isHome: match.isHome,
        location: match.location,
      },
    });
  }

  console.log('📆 Generando Eventos Oficiales (Autonómicos, Nacionales y Jocs)...');
  for (const ev of EVENTOS) {
    await prisma.clubEvent.create({
      data: {
        name: ev.name,
        date: new Date(ev.date),
        endDate: ev.endDate ? new Date(ev.endDate) : null,
        region: ev.region as any,
        color: ev.color,
        clubId: club.id,
        seasonId: currentSeason?.id as string,
      },
    });
  }
  console.log('📆 Generando Horarios de Clase');
  for (const horario of schedulesCTM) {
    await prisma.generalTrainingSchedule.create({
      data: {
        clubId: club.id,
        name: horario.name,
        startTime: horario.startTime,
        endTime: horario.endTime,
        daysOfWeek: horario.daysOfWeek,
      },
    });
  }

  console.log('✅ ¡Seed completado con éxito y limpiado de datos falsos!');
  console.log(`👤 Admin: ${admin.email} `);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
