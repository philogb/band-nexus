/*global Request:true, $jit:true*/

(function() {

//Log singleton
var Log = {
  elem: null,
  timer: null,

  getElem: function() {
    if (!this.elem) {
      return (this.elem = $('log-message'));
    }
    return this.elem;
  },

  write: function(text, hide) {
    if (this.timer) {
      this.timer = clearTimeout(this.timer);
    }

    var elem = this.getElem(),
        style = elem.style;

    style.height = '2.1em';
    elem.innerHTML = text;
    style.visibility = 'visible';

    if (hide) {
      this.timer = setTimeout(function() {
        style.visibility = 'hidden';
        style.height = 0;
        elem.innerHTML = '';
      }, 5000);
    }
  }
};

function buildTreeJSON(json) {
  var keys = {},
      tree, root, children, key, name;

  for (key in json) {
    tree = {
      id: key,
      name: key,
      children: []
    };
    children = json[key];
    for (key in children) {
      name = key;
      if (!keys.hasOwnProperty(key)) {
        keys[key] = 1;
      } else {
        key = key + keys[key]++;
      }
      tree.children.push({
        id: key,
        name: name,
        children: children[name].map(function(key) {
          var name = key;
          if (!keys.hasOwnProperty(key)) {
            keys[key] = 1;
          } else {
            key = key + keys[key]++;
          }
          return {
            id: key,
            name: name
          };
        })
      });
    }
  }
  return tree;
}

function loadTree(ht, bandName, callback) {
  Log.write('Loading data...');

  new Request.JSON({
    url: 'data/bands/_' + bandName + '.txt',
    onSuccess: function(json) {
      json = buildTreeJSON(json);
      callback(ht, json);
      Log.write('Done.', true);
    },
    onFailure: function(e) {
      Log.write('There\'s no entry in the database for ' + bandName + '. Sorry.', true);
    }
  }).get();
}

function renderTree(ht, json) {
  //load JSON data
  ht.loadJSON(json);
  ht.graph.eachNode(function(n) {
    var pos = n.getPos();
    pos.setc(0, 0);
  });
  ht.compute('end');
  ht.fx.animate({
    modes:['polar'],
    duration: 2000,
    hideLabels: true,
    transition: $jit.Trans.Quint.easeInOut
  });
}

function buildGraph() {
  var levelDistance =  Math.min(window.innerWidth, window.innerHeight) / 5,
      ht = new $jit.Hypertree({
        injectInto: 'tree',
        offset: 0.1,

        Navigation: {
          enable: true,
          panning: true,
          zooming: 10
        },

        Node: {
          overridable: true,
          color: 'red',
          dim: 9,
          CanvasStyles: {
            shadowBlur: 3,
            shadowColor: '#111'
          }
        },

        Edge: {
          overridable: true,
          color: '#23A4FF',
          lineWidth:1.8
        },

        onCreateLabel: function(domElement, node){
          domElement.innerHTML = node.name;
          domElement.onclick = function(){
            if (node._depth != 1) {
              return;
            }
            loadTree(ht, node.name, function(ht, json) {
              json.id = node.id;
              ht.onClick(node.id, {
                hideLabels: true,
                onComplete: function() {
                  ht.op.morph(json, {
                    type: 'fade',
                    id: node.id,
                    duration: 2000,
                    hideLabels: true
                  });
                }
              });
            });
          };
        },

        onPlaceLabel: function(domElement, node){
          var style = domElement.style;
          style.display = '';

          if (node._depth <= 1) {
            domElement.className = 'node depth0';
          } else if(node._depth == 2){
            domElement.className = 'node depth2';
          } else {
            style.display = 'none';
          }

          var left = parseInt(style.left, 10);
          var w = domElement.offsetWidth;
          style.left = (left - w / 2) + 'px';
        }
      });

  return ht;
}

window.addEvent('domready', function(e) {
  var body = $(document.body),
      links = body.getElements('nav > ul > li > a'),
      input = $('input-names'),
      select = $('other-select'),
      datalist = $('artist-names'),
      ht = buildGraph(),
      firstBand = 'Metallica',
      list;

  links.addEvent('click', function(e) {
    e.stop();
    var name = this.textContent,
        index = list.indexOf(name);

    select.selectedIndex = index;
    input.value = name;

    loadTree(ht, this.textContent, renderTree);
  });

  select.addEvent('change', function(e) {
    var name = this.value;
    input.value = name;

    loadTree(ht, this.value, renderTree);
  });

  input.addEvent('change', function(e) {
    var name = this.value,
        index = list.indexOf(name);

    select.selectedIndex = index;

    loadTree(ht, this.value, renderTree);
  });

  new Request({
    url: 'data/list.txt',
    method: 'get',
    onSuccess: function(text) {
      list = text.split('\n');
      select.innerHTML = '<option>' + list.join('</option><option>') + '</option>';
      datalist.innerHTML = select.innerHTML;
      input.value = firstBand;
      input.fireEvent('change');
    },
    onFailure: function() {
      Log.write('There was an error while requesting the list of bands.', true);
    }
  }).send();

  window.addEvent('resize', function(e) {
    ht.canvas.resize(window.innerWidth,
                         window.innerHeight);
  });

  loadTree(ht, firstBand, renderTree);
});

})();
