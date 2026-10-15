import { CompanySettings } from '../types';

export const INITIAL_COMPANY_SETTINGS: CompanySettings = {
  tradeName: 'ALMA PRINT — Gráfica e Embalagens',
  legalName: 'ALMA NEGÓCIOS E SERVIÇOS LTDA',
  cnpj: '65.349.937/0001-12',
  unit: 'Campinas - SP',
  address: 'Rua Regente Feijó, 484 - Centro',
  zipCode: '13013-051',
  city: 'Campinas',
  state: 'SP',
  phone: '19 9 9359-9923',
  email: 'contato@almaprintgrafica.com.br',
  instagram: 'almaprint.grafica',
  headerServices: 'OFFSET\nDIGITAL\nEMBALAGENS\nBRINDES\nSIGN',
  pixKey: '52.917.006/0001-21',
  nextOrderNumber: 8579,
};

export const SUPER_ADMIN_EMAIL = 'ferreiraguih91@gmail.com';

export const INITIAL_AUTHORIZED_EMAILS = [
  SUPER_ADMIN_EMAIL,
  'silvanofilhobrasil@gmail.com',
];
