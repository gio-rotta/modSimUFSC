var Caminhao = Backbone.Model.extend({
  idAttribute: 'pk',
  defaults: {
    estaCarregado: false,
    estaCarregandoEmC2: false,
    estaNaFilaDePesagem: false,
    estaNaFilaDeCarregamento: false,
    estaPesando: false,
    estaEntregando: false,
    viagensConcluidas: 0,
    visivel: true,
    lista: false,
  },

  initialize: function(options) {
    this.set({modelo: Math.floor(Math.random() * 4 + 1)});
  },

  setarPosicao: function(x, y) {
    this.set({x: x});
    this.set({y: y});
  },
});

var CaminhaoCollection = Backbone.Collection.extend({
  model: Caminhao,

  initialize: function(models, options) {
    this.listaFilaCarregamento = [];
    this.listaFilaPesagem = [];
    this.carregamentoC1 = [];
    this.carregamentoC2 = [];
    this.pesagem = [];
    this.viagem = [];
  },

  atualizarGraficos: function() {
    this.trigger('atualizarGraficos');
  },

  atualizarListaCarregamento: function() {
    var tamanhoFila = this.listaFilaCarregamento.length;
    for (var i = 0; i < tamanhoFila; i++) {
      var model = this.listaFilaCarregamento[i];
      if (i < 10) {
        var posicaoX = 410 - i * 60;
        var posicaoY = 86; 
      } else {
        var posicaoX = -70;
        var posicaoY = 86;
      }
      model.view.mover(posicaoX, posicaoY);
      model.setarPosicao(posicaoX, posicaoY);
    }
  },

  atualizarListaPesagem: function() {
    var tamanhoFila = this.listaFilaPesagem.length;
    for (var i = 0; i < tamanhoFila; i++) {
      var model = this.listaFilaPesagem[i];
      if (i < 3) {
        var posicaoX = 1010 - (i + 1) * 140;
        var posicaoY = 86; 
      } else {
        var posicaoX = 590  ;
        var posicaoY = 86;
      }
      model.view.mover(posicaoX, posicaoY);
      model.setarPosicao(posicaoX, posicaoY);
    }
  },

  retirarCaminhaoDaFilaCarregamento: function() {
    var caminhao = this.listaFilaCarregamento.shift();
    var tamanhoFila = this.listaFilaCarregamento.length;
    for (var i = 0; i < tamanhoFila; i++) {
      var model = this.listaFilaCarregamento[i];
      if (i < 10) {
        var posicaoX = 410 - i * 60;
        var posicaoY = 86; 
      } else {
        var posicaoX = -70;
        var posicaoY = 86;
      }
      model.view.mover(posicaoX, posicaoY);
      model.setarPosicao(posicaoX, posicaoY);
    }
    this.atualizarGraficos();
    return caminhao;
  },

  retirarCaminhaoDaFilaPesagem: function() {
    var caminhao = this.listaFilaPesagem.shift();
    var tamanhoFila = this.listaFilaPesagem.length;
    for (var i = 0; i < tamanhoFila; i++) {
      var model = this.listaFilaPesagem[i];
      if (i < 3) {
        var posicaoX = 1010 - (i + 1) * 140;
        var posicaoY = 86; 
      } else {
        var posicaoX = 590  ;
        var posicaoY = 86;
      }
      model.view.mover(posicaoX, posicaoY);
      model.setarPosicao(posicaoX, posicaoY);
    }
    this.atualizarGraficos();
    return caminhao;
  },

  alocarCaminhaoNaFilaCarregamento: function(model) {
    this.listaFilaCarregamento.push(model);
    var tamanhoFila = this.listaFilaCarregamento.length;
    if ( this.listaFilaCarregamento.indexOf(model) < 10) {
      var posicaoX = 470 - tamanhoFila * 60;
      var posicaoY = 86; 
    } else {
      var posicaoX = -70;
      var posicaoY = 86;
    }
    model.view.mover(posicaoX, posicaoY);
    model.setarPosicao(posicaoX, posicaoY);
        this.atualizarGraficos();
  },

  alocarCaminhaoNaViagem: function(model) {
    this.viagem.push(model);
    function esconde(model) {
     // model.set({visivel: false});
    };
    model.view.sair(1500, 86, esconde);
    model.view.viajar();
    this.atualizarGraficos();
  },

  alocarCaminhaoNaFilaPesagem: function(model) {
    this.atualizarListaPesagem();
    this.listaFilaPesagem.push(model);
    var tamanhoFila = this.listaFilaPesagem.length;
    if ( tamanhoFila < 3 ) {
      var posicaoX = 1010 - tamanhoFila * 140;
      var posicaoY = 86; 
    } else {
      var posicaoX = 590;
      var posicaoY = 86;
    }
    model.view.sair(posicaoX, posicaoY);
    model.setarPosicao(posicaoX, posicaoY);
    this.atualizarGraficos();
  },

  alocarCaminhaoNaPesagem: function(model) {
    this.pesagem.push(model);
    var posicaoX = 1010;
    var posicaoY = 30; 
    model.view.entrar(posicaoX, posicaoY);
    model.setarPosicao(posicaoX, posicaoY);
    this.atualizarGraficos();
  },

  alocarCaminhaoNoCarregamento: function(model, carregamento) {
    if (carregamento == 'C1') {
      this.carregamentoC1.push(model);
      var posicaoX = 550;
      var posicaoY = 30; 
    } else {
      this.carregamentoC2.push(model);
      var posicaoX = 550;
      var posicaoY = 140;
    }

    function carrega(model) {
      model.set({estaCarregado: true});
    };
    model.view.entrar(posicaoX, posicaoY, carrega);
    model.setarPosicao(posicaoX, posicaoY);
    this.atualizarGraficos();
  },

  quantidadeNaFilaDeCarregamento: function() {
    var pks = _.map(this.filter({estaVazio: true}), function(model) { return model.get('pk') });
    return pks.length;
  },

  quantidadeNaFilaDePesagem: function() {
    var pks = _.map(this.filter({estaNaFilaDePesagem: true}), function(model) { return model.get('pk') });
    return pks.length;
  },

  quantidadeEntregando: function() {
    var pks = _.map(this.filter({estaEntregando: true}), function(model) { return model.get('pk') });
    return pks.length;
  },
});




































