// Lee el cuerpo de la petición y lo convierte de JSON a objeto
const leerJson = (req) =>
  new Promise((resolve, reject) => {
    let cuerpo = '';
    req.on('data', (parte) => {
      cuerpo += parte;
      if (cuerpo.length > 1e6) {
        reject(new Error('CUERPO_GRANDE'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!cuerpo) return resolve({});
      try {
        resolve(JSON.parse(cuerpo));
      } catch {
        reject(new Error('JSON_INVALIDO'));
      }
    });
    req.on('error', reject);
  });

// Responde con JSON y el código de estado indicado
const enviarJson = (res, estado, datos) => {
  res.writeHead(estado, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(datos));
};

module.exports = { leerJson, enviarJson };
