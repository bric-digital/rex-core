// Testing web server to validate that headers are being set correctly.

import express from 'express'

const app = express();
const port = 3000;

app.use(express.static('./tests/scripts/express/static'))

const defaultConfiguration = {
  'configuration_url': 'config.json',
  'identifier': 'CHANGE-ME',
  'ui': [{
      'title': 'REX Core Module Testing Extension',
      'identifier': 'main',
      'default': true,
      'depends_on': [
          'did_load',
          'fetched_network'
      ]
  }, {
      'title': 'REX Core Module Network Fetch Test',
      'identifier': 'network_test',
      'depends_on': [
          'did_load'
      ]
  }, {
      'title': 'REX Core Module Loading Test',
      'identifier': 'time_test'
  }]
}

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); 
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.get('/validate-json.json', (req, res) => {
  const newConfig = { ...defaultConfiguration }

  newConfig.identifier = req.query.id

  res.json(newConfig);
});

app.get('/validate-no-json.json', (req, res) => {
  const newConfig = { ...defaultConfiguration }

  newConfig.identifier = req.query.id

  res.send(newConfig.identifier) // JSON.stringify(newConfig));
});

app.get('/', (req, res) => {
  res.send('hello world');
});


app.listen(port, () => {
  console.log(process.cwd())
  console.log(`Server running on port ${port}...`);
});
