const slug = new URLSearchParams(location.search).get('guide');
if (['lack', 'poang', 'malm'].includes(slug)) {
  document.querySelector('#collection').hidden = true;
  const data = import.meta.glob('./data/*.js');
  const models = import.meta.glob('./models/*.js');
  Promise.all([
    data[`./data/${slug}.js`](), models[`./models/${slug}.js`](), import('./guide-app.js'),
  ]).then(([{ guide }, { createModel }, { startGuide }]) => {
    startGuide(guide, createModel);
    document.querySelector('.app-shell').hidden = false;
  }).catch(error => {
    console.error('Guide could not load:', error);
    document.querySelector('.app-shell').hidden = true;
    document.querySelector('#collection').hidden = false;
    const message = document.createElement('p');
    message.className = 'version-note';
    message.textContent = 'This guide could not load. Please reload the page or choose another guide.';
    document.querySelector('.collection-intro').append(message);
  });
}
