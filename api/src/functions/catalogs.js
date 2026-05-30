const { makeCatalog } = require('../catalog-factory');

makeCatalog('sedes',              [],               'nombre', [], 'cat_sedes');
makeCatalog('tiposNombramiento',  [],               'nombre', [], 'cat_tiposNom');
makeCatalog('vinculaciones',      [],               'nombre', [], 'cat_vinculacion');
makeCatalog('fuentes',            [],               'nombre', [], 'cat_fuentes');
makeCatalog('gestores',           [],               'nombre', [], 'cat_gestores');
makeCatalog('verificaciones',     ['color'],         'nombre', [], 'cat_verificaciones');
makeCatalog('cfs',                ['codigo'],        'codigo', [], 'cat_cfs');
