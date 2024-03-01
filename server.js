const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const port = 3000;
const publicDirectory = path.join(__dirname, 'public');
const animalsFilePath = path.join(publicDirectory, 'animals.json');

const server = http.createServer((req, res) => {

  if (req.url.startsWith('/api/animals')) {
    handleAnimalsAPI(req, res);
    return;
  }


  let filePath = path.join(publicDirectory, req.url === '/' ? 'index.html' : req.url);
  let extname = String(path.extname(filePath)).toLowerCase();
  let contentType = 'text/html';
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml'
  };

  contentType = mimeTypes[extname] || contentType;

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        fs.readFile(path.join(publicDirectory, '404.html'), (err, content) => {
          res.writeHead(404, { 'Content-Type': 'text/html' });
          res.end(content, 'utf-8');
        });
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

const handleAnimalsAPI = (req, res) => {
  switch (req.method) {
    case 'GET':
      fs.readFile(animalsFilePath, (err, data) => {
        if (err) {
          res.writeHead(500);
          res.end(JSON.stringify({ message: 'Error reading animal data' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(data);
      });
      break;

    case 'POST':
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        fs.readFile(animalsFilePath, (err, data) => {
          if (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ message: 'Error reading animal data' }));
            return;
          }
          const animals = JSON.parse(data);
          const newAnimal = JSON.parse(body);
          animals.animals.push(newAnimal);
          fs.writeFile(animalsFilePath, JSON.stringify(animals, null, 2), err => {
            if (err) {
              res.writeHead(500);
              res.end(JSON.stringify({ message: 'Error writing animal data' }));
              return;
            }
            res.writeHead(201);
            res.end(JSON.stringify(newAnimal));
          });
        });
      });
      break;

    case 'PUT':
      const updateId = new URL(req.url, `http://${req.headers.host}`).pathname.split('/').pop();
      let updateBody = '';
      req.on('data', chunk => {
        updateBody += chunk.toString();
      });
      req.on('end', () => {
        fs.readFile(animalsFilePath, (err, data) => {
          if (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ message: 'Error reading animal data' }));
            return;
          }
          const animals = JSON.parse(data);
          const animalIndex = animals.animals.findIndex(animal => animal['Animal ID'] === updateId);
          if (animalIndex !== -1) {
            const updatedAnimal = JSON.parse(updateBody);
            animals.animals[animalIndex] = updatedAnimal;
            fs.writeFile(animalsFilePath, JSON.stringify(animals), err => {
              if (err) {
                res.writeHead(500);
                res.end(JSON.stringify({ message: 'Error writing animal data' }));
                return;
              }
              res.writeHead(200);
              res.end(JSON.stringify(updatedAnimal));
            });
          } else {
            res.writeHead(404);
            res.end(JSON.stringify({ message: 'Animal not found' }));
          }
        });
      });
      break;

    case 'DELETE':
      const deleteId = new URL(req.url, `http://${req.headers.host}`).pathname.split('/').pop();
      fs.readFile(animalsFilePath, (err, data) => {
        if (err) {
          res.writeHead(500);
          res.end(JSON.stringify({ message: 'Error reading animal data' }));
          return;
        }
        let animals = JSON.parse(data);
        const newAnimals = animals.animals.filter(animal => animal['Animal ID'] !== deleteId);
        if (animals.animals.length === newAnimals.length) {
          res.writeHead(404);
          res.end(JSON.stringify({ message: 'Animal not found' }));
          return;
        }
        animals.animals = newAnimals;
        fs.writeFile(animalsFilePath, JSON.stringify(animals), err => {
          if (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ message: 'Error writing animal data' }));
            return;
          }
          res.writeHead(200);
          res.end(JSON.stringify({ message: 'Animal deleted' }));
        });
      });
      break;

    default:
      res.writeHead(405);
      res.end(JSON.stringify({ message: 'Method Not Allowed' }));
  }
};

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
