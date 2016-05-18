function Timer(callback, delay) {
    var timerId, start, remaining = delay;

    this.pause = function() {
        window.clearTimeout(timerId);
        remaining -= new Date() - start;
    };

    this.resume = function() {
        start = new Date();
        window.clearTimeout(timerId);
        timerId = window.setTimeout(callback, remaining);
    };

    this.resume();
}

var Configuracao = Backbone.View.extend({
  el: '#myModal',

  events: {
    'click .iniciar-simulacao': 'iniciarSimulacao',
  },

  initialize: function(options) {
    this.$el.on('shown.bs.modal', function () {
      $('#myInput').focus()
    })
  },

  iniciarSimulacao: function() {
    this.$el.find('.cancel-modal').click();
    $('#introducao').addClass('hidden');
    $('#simulacao').removeClass('hidden');
    $('.acao-inicio').addClass('hidden');
    $('.acao-pausa').removeClass('hidden');

    var funcaoCarregamento = this.$el.find("input[name='carregamento']:checked").val();
    var parametrosFuncaoCarregamento = {};
    this.$el.find("input[name='carregamento']:checked").parent().children("input[type='text']").each(function () {
      parametrosFuncaoCarregamento[this.name] = this.value
    });
    var funcaoPesagem = this.$el.find("input[name='pesagem']:checked").val();
    var parametrosFuncaoPesagem = {};
    this.$el.find("input[name='pesagem']:checked").parent().children("input[type='text']").each(function () {
      parametrosFuncaoPesagem[this.name] = this.value
    });
    var funcaoViagem = this.$el.find("input[name='viagem']:checked").val();
    var parametrosFuncaoViagem = {};
    this.$el.find("input[name='viagem']:checked").parent().children("input[type='text']").each(function () {
      console.log('teste')
      parametrosFuncaoViagem[this.name] = this.value;
    });
    var numeroCaminhoes = this.$el.find('.n-entidades').val();
    var numeroPassos = this.$el.find('.n-passos').val();
    var velocidade = this.$el.find('.passo-simulacao').val();

    var frota = new CaminhaoCollection();
    var mundo = new Mundo({
      collection: frota,
      numeroCaminhoes: numeroCaminhoes,
      velocidade: velocidade,
      numeroPassos: numeroPassos,
      funcaoCarregamento: funcaoCarregamento,
      parametrosFuncaoCarregamento: parametrosFuncaoCarregamento,
      funcaoPesagem: funcaoPesagem,
      parametrosFuncaoPesagem: parametrosFuncaoPesagem,
      funcaoViagem: funcaoViagem,
      parametrosFuncaoViagem: parametrosFuncaoViagem
    })
  }
})

var CaminhaoView = Backbone.View.extend({
  tagName: 'div',
  model: Caminhao,

  className: function() {
    var name = 'caminhao-'+this.model.get('modelo');
    return name;
  },

  initialize: function(options) {
    this.options = _.defaults(options || {}, this.defaults);
    this.criaToolTip()
    this.listenTo(this.model, 'change:visivel', this.mudarVisibilidade.bind(this));
    this.listenTo(this.model, 'change:estaCarregado', this.mudarCarregamento.bind(this)); 
    this.listenTo(this.model, 'change:viagensConcluidas', this.criaToolTip.bind(this)); 
  },

  criaToolTip: function() {
    this.$el.tooltip({
      title: "Viagens concluidas: "+ this.model.get('viagensConcluidas'),
      placement: "top"
    })
    .attr('data-original-title', "Viagens concluidas: "+ this.model.get('viagensConcluidas'))
    .tooltip('fixTitle');
  },

  mudarVisibilidade: function() {
    if (this.model.get('visivel')) {
      this.model.view.$el.toggleClass('hidden', false);
    } else {
      this.model.view.$el.toggleClass('hidden', true);
    }
  },

  mudarCarregamento: function() {
    if (this.model.get('estaCarregado')) {
      this.model.view.$el.html('<div class="carregado"></div>');
    } else {
      this.model.view.$el.html(' ');
    }
  },

  viajar: function() {
    var that = this;
    this.$el.animate({top: -100}, this.options.velocidade/3, function() {});
    this.$el.animate({left: -60}, this.options.velocidade/3, function() {});
    this.$el.animate({top: 86}, this.options.velocidade/3, function() {});
  },

  mover: function(x, y) {
    this.$el.animate({left: x}, this.options.velocidade, function() {/* Animation complete.*/ });
    this.$el.css({top: y});
  },

  entrar: function(x, y, func) {
    var that = this;
    that.$el.animate({left: x}, that.options.velocidade/2, function() {});
    that.$el.animate({top: y}, that.options.velocidade/2, function() { if(func) func(that.model) });
  },

  sair: function(x, y, func) {
    var that = this;
    this.$el.animate({top: y}, this.options.velocidade/2, function() {});
    that.$el.animate({left: x}, that.options.velocidade/2, function() {if(func) func(that.model) })
  },

})

var Mundo = Backbone.View.extend({
  el: '#app',

  defaults: {
    funcaoCarregamento: 'constante',
    parametrosFuncaoCarregamento: {constante: 2},
    funcaoPesagem: 'constante',
    parametrosFuncaoPesagem: {constante: 2},
    funcaoViagem: 'constante',
    parametrosFuncaoViagem: {constante: 2},
    numeroCaminhoes: 1,
    velocidade: 1000,
    numeroPassos: 100,
  },

  events: {
    'click .pause': 'pause',
    'click .resume': 'resume',
    'click .finish': 'finish',
  },


  initialize: function(options) {
    this.options = _.defaults(options || {}, this.defaults);
    this.estatistica = new Estatistica({
      collection: this.collection,
      entidades: this.options.numeroCaminhoes
    });
    this.isPaused = false;
    this.counter = 0;
    this.criarCaminhoes();
    this.atualizarContagemFilaCarregamento();
    this.atualizarContagemFilaPesagem();
    this.vTimeout = [];
    var that = this;
    that.alocarCaminhaoNoCarregamento();
    that.alocarCaminhaoNoCarregamento();
    this.lacoPrincipal = setInterval( function() {
      if(!that.isPaused) {
        that.estatistica.adicionarStatusOcupacao(that.collection.listaFilaCarregamento.length,
        that.collection.carregamentoC1.length + that.collection.carregamentoC2.length,
        that.collection.listaFilaPesagem.length, that.collection.pesagem.length, that.collection.viagem.length);
        that.atualizarContador();
      }
    }, this.options.velocidade );
  },

  finish: function(event) {
    event && event.preventDefault();
    clearInterval(this.lacoPrincipal);
    clearInterval(this.c1Timeout);
    clearInterval(this.c2Timeout);
    clearInterval(this.p1Timeout);
    for (var i = 0; i < this.vTimeout.length; i++) {
      clearInterval(this.vTimeout[i]);
    };
    $('.acao-pausa').addClass('hidden');
  },

  pause: function(event) {
    event && event.preventDefault();
    this.isPaused = true;
    this.c1Timeout && this.c1Timeout.pause();
    this.c2Timeout && this.c2Timeout.pause();
    this.p1Timeout && this.p1Timeout.pause();
    for (var i = 0; i < this.vTimeout.length; i++) {
      this.vTimeout[i] && this.vTimeout[i].pause();
    };
    $('.pause').toggleClass('hidden');
    $('.resume').toggleClass('hidden');
  },

  resume: function(event) {
    event && event.preventDefault();
    this.isPaused = false;
    this.c1Timeout && this.c1Timeout.resume();
    this.c2Timeout && this.c2Timeout.resume();
    this.p1Timeout && this.p1Timeout.resume();
    for (var i = 0; i < this.vTimeout.length; i++) {
      this.vTimeout[i] && this.vTimeout[i].resume();
    };
    $('.pause').toggleClass('hidden');
    $('.resume').toggleClass('hidden');
  },

  aplicarAlgoritmo: function(algoritmo, parametros) {
    switch (algoritmo) {
      case 'constante':
        var tempo = parseInt(parametros.constante);
        break;
      case 'aleatorio':
        var tempo = Math.floor((Math.random() * parseInt(parametros.limite)) + parseInt(parametros.base))
        break;
      case 'normal':
        var tempo = this.algoritmoNormal(parametros);
        break;
      case 'exponencial':
        var tempo = this.algoritmoExponencial(parametros);
        break
      case 'triangular':
        var tempo = this.algoritmoTriangular(parametros);
        break;
      case 'uniforme':
        var tempo =  this.algoritmoUniforme(parametros);
        break;
      default:
        var tempo = 4;
        break;
    }

    var tempo = Math.round(tempo*this.options.velocidade);
    return tempo;
  },

  algoritmoNormal: function(parametros) {
    //função normal , parametros: media u, desvio padrao o
    var u = parseInt(parametros.media);
    var o = parseInt(parametros.desvPadrao);
    var z = Math.pow((-2 * Math.log(Math.random())), 0.5) * Math.cos(2*180*Math.random());
    var x = u + (z * o);
    return x;
  },

  algoritmoUniforme: function(parametros) {
    //função distribuicao uniforme, parametros: intervalo [5-20].
    var menor = parseInt(parametros.base);
    var maior = parseInt(parametros.limite);
    var x = menor + (maior - menor) * Math.random();
    return x;
  },

  algoritmoTriangular: function(parametros) {
    //função triangular , parametros: x1, x2, x3
    var a = parseInt(parametros.a);
    var b = parseInt(parametros.b);
    var c = parseInt(parametros.c);
    var valorAleatorio = Math.random();
    var constante = b - a / c - a;
    if ( valorAleatorio < constante ) {
      var x = a + Math.sqrt(Math.round(valorAleatorio*(b-a)*(c-a)));
    } else if ( constante > valorAleatorio) {
      var x = c - Math.sqrt(Math.round((1-valorAleatorio)*(c-b)*(c-a)));
    }
    return x;
  },

  algoritmoExponencial: function(parametros) {
    //função exponencial , parametros: lambida
    var lambda = parseInt(parametros.lambda);
    var x = -lambda * Math.log(Math.random());
    return x
  },

  criarCaminhoes: function() {
    var numeroCaminhoes = this.options.numeroCaminhoes;
    for (var i = 0; i < numeroCaminhoes; i++) {
      var caminhao = new Caminhao({pk:i});
      caminhao.view = new CaminhaoView({model: caminhao, velocidade: this.options.velocidade});
      caminhao.linha = this.estatistica.adicionarNovaLinha(this.estatistica.tabelaSimulacao.length, this.counter);
      this.collection.alocarCaminhaoNaFilaCarregamento(caminhao);
      this.$el.find('.rua').append(caminhao.view.$el);
    }
  },

  alocarCaminhaoNoCarregamento: function() {
    var that = this;
    var tamanhoFilaCarregamento = this.collection.listaFilaCarregamento.length;
    if ( tamanhoFilaCarregamento > 0 ) { 
      if ( this.collection.carregamentoC1.length == 0 ) {
        var caminhao = this.collection.retirarCaminhaoDaFilaCarregamento();
        caminhao.linha.tempoNaFilaCarregamento = this.counter - caminhao.linha.tempoDeChegadaNoRelogio;
        this.estatistica.atualizarLinha(caminhao.linha); 
        this.collection.alocarCaminhaoNoCarregamento(caminhao, "C1");
        this.atualizarContagemFilaCarregamento();
        that.realizarCarregamentoC1();
      } else if ( this.collection.carregamentoC2.length == 0 ) {
        var caminhao = this.collection.retirarCaminhaoDaFilaCarregamento();
        caminhao.linha.tempoNaFilaCarregamento = this.counter - caminhao.linha.tempoDeChegadaNoRelogio;
        this.estatistica.atualizarLinha(caminhao.linha);
        this.collection.alocarCaminhaoNoCarregamento(caminhao, "C2");
        this.atualizarContagemFilaCarregamento();
        that.realizarCarregamentoC2();
      }
    }
  },

  realizarCarregamentoC1: function() {
    var tempo = this.aplicarAlgoritmo(this.options.funcaoCarregamento, this.options.parametrosFuncaoCarregamento);  
    var that = this;
    if (this.collection.carregamentoC1.length > 0) {
      this.c1Timeout = new Timer( function() {
        if (that.collection.carregamentoC1.length > 0) {
          var caminhao = that.collection.carregamentoC1.shift();
          caminhao.linha.tempoDoCarregamento = tempo/1000;
          if (that.collection.pesagem.length > 0 || that.collection.listaFilaPesagem.length > 0) {
            that.estatistica.atualizarLinha(caminhao.linha);
            that.collection.alocarCaminhaoNaFilaPesagem(caminhao);
            that.alocarCaminhaoNoCarregamento();
          } else {
            caminhao.linha.tempoNaFilaDePesagem = 0;
            that.estatistica.atualizarLinha(caminhao.linha);
            that.collection.alocarCaminhaoNaPesagem(caminhao);
            that.alocarCaminhaoNoCarregamento();
            that.realizarPesagem();
          }
          that.atualizarContagemFilaPesagem();
        }
      }, tempo);
    }
  },

  realizarCarregamentoC2: function() {
    var tempo = this.aplicarAlgoritmo(this.options.funcaoCarregamento, this.options.parametrosFuncaoCarregamento);  
    var that = this;
    if ( this.collection.carregamentoC2.length > 0 ) {
      this.c2Timeout = new Timer( function() {
        if (that.collection.carregamentoC2.length > 0) {
          var caminhao = that.collection.carregamentoC2.shift();
          caminhao.linha.tempoDoCarregamento = tempo/1000;
          if (that.collection.pesagem.length > 0 || that.collection.listaFilaPesagem.length > 0) {
            that.estatistica.atualizarLinha(caminhao.linha);
            that.collection.alocarCaminhaoNaFilaPesagem(caminhao);
            that.alocarCaminhaoNoCarregamento();
          } else {
            caminhao.linha.tempoNaFilaDePesagem = 0;
            that.estatistica.atualizarLinha(caminhao.linha);
            that.collection.alocarCaminhaoNaPesagem(caminhao);
            that.alocarCaminhaoNoCarregamento();
            that.realizarPesagem();
          }
          that.atualizarContagemFilaPesagem();
        }
      }, tempo);
    }
  },

  alocarCaminhaoNaPesagem: function() {
    var that = this;
    var tamanhoFilaPesagem = this.collection.listaFilaPesagem.length; 
    if ( this.collection.pesagem.length == 0 ) {
      if ( tamanhoFilaPesagem > 0 ) {
        var caminhao = this.collection.retirarCaminhaoDaFilaPesagem();
        caminhao.linha.tempoNaFilaDePesagem = this.counter - (caminhao.linha.tempoDoCarregamento + caminhao.linha.tempoNaFilaCarregamento + caminhao.linha.tempoDeChegadaNoRelogio);
        that.estatistica.atualizarLinha(caminhao.linha);
        this.collection.alocarCaminhaoNaPesagem(caminhao);
        setTimeout(function() { that.realizarPesagem() });
        this.atualizarContagemFilaPesagem();
      }
    }
  },

  realizarPesagem: function() {
    var that = this;
    var tempo = this.aplicarAlgoritmo(this.options.funcaoPesagem, this.options.parametrosFuncaoPesagem);
    if (this.collection.pesagem.length > 0) {
      this.p1Timeout = new Timer( function() {
        if (that.collection.pesagem.length > 0) {
          var caminhao = that.collection.pesagem.shift();
          caminhao.linha.tempoDaPesagem = tempo/1000;
          that.estatistica.atualizarLinha(caminhao.linha);
          that.collection.alocarCaminhaoNaViagem(caminhao);
          that.alocarCaminhaoNaPesagem();
          that.realizarViagem();
        }
      }, tempo);
    }
  },

  realizarViagem: function() {
    var tempo = this.aplicarAlgoritmo(this.options.funcaoViagem, this.options.parametrosFuncaoViagem);
    var that = this;
    if (this.collection.viagem.length > 0) {
      var timerViagem = new Timer( function() {
      if (that.collection.viagem.length > 0) {
        var caminhao = that.collection.viagem.shift();
        caminhao.linha.tempoDeViagem = tempo/1000;
        caminhao.linha.tempoDoSistema = that.counter - caminhao.linha.tempoDeChegadaNoRelogio;
        that.estatistica.atualizarLinha(caminhao.linha);
        caminhao.set({viagensConcluidas: parseInt(caminhao.get('viagensConcluidas')) + 1})
        caminhao.set({estaCarregado: false})
        caminhao.set({visivel:true});
        that.vTimeout.shift()
        caminhao.linha = that.estatistica.adicionarNovaLinha(that.estatistica.tabelaSimulacao.length, that.counter);
        if (that.collection.carregamentoC1.length == 0 && that.collection.listaFilaCarregamento.length == 0) {
          that.collection.alocarCaminhaoNoCarregamento(caminhao, "C1");
          that.realizarCarregamentoC1();
        } else if(that.collection.carregamentoC2.length == 0 && that.collection.listaFilaCarregamento.length == 0) {
          that.collection.alocarCaminhaoNoCarregamento(caminhao, "C2");
          that.realizarCarregamentoC2();
        } else {
          that.collection.alocarCaminhaoNaFilaCarregamento(caminhao);
        }
      }
    }, tempo);
    this.vTimeout.push(timerViagem);
    }
  },

  atualizarContagemFilaCarregamento: function() {
    var tamanhoFila = this.collection.listaFilaCarregamento.length; 
    if (tamanhoFila > 0) {
      this.$el.find('.fila-carregamento').toggleClass('hidden', false);  
      this.$el.find('.fila-carregamento').find('.numero').html(tamanhoFila);
    } else {
      this.$el.find('.fila-carregamento').toggleClass('hidden', true);
    }
  },

  atualizarContagemFilaPesagem: function() {
    var tamanhoFila = this.collection.listaFilaPesagem.length; 
    if (tamanhoFila > 0) {
      this.$el.find('.fila-pesagem').toggleClass('hidden', false);  
      this.$el.find('.fila-pesagem').find('.numero').html(tamanhoFila);
    } else {
      this.$el.find('.fila-pesagem').toggleClass('hidden', true);
    }
  },

  atualizarContador: function() {
    var $contador = this.$el.find('.contador');
    $contador.html(this.counter);
    this.counter++;
    if (this.counter >= this.options.numeroPassos) {
      this.pause();
      this.finish();
    }
  }
})

var Estatistica = Backbone.View.extend({
  el: '.estatistica',

  initialize: function(options) {
    this.options = _.defaults(options || {}, this.defaults);
    Chart.defaults.global.legend.position = 'bottom';
    Chart.defaults.global.legend.labels.boxWidth = 10;
    Chart.defaults.global.legend.labels.fontSize = 10;
    Chart.defaults.global.legend.labels.padding = 5;
    this.tabelaSimulacao = [];
    this.tabelaOcupacao = [];
    this.renderNumeroEntidades();
    this.renderAlocacaoMedio();
    this.renderTempoMedio();
    this.listenTo(this.collection, 'atualizarGraficos', this.atualizarGraficos.bind(this));
  },

  adicionarStatusOcupacao: function(fila1, carregamento, fila2, pesagem, viagem) {
    var status = {
      fila1: fila1,
      carregamento: carregamento,
      fila2: fila2,
      pesagem: pesagem,
      viagem: viagem
    }
    this.tabelaOcupacao.push(status);
  },

  adicionarNovaLinha: function(id, t1) {
    var anterior, t2;
    if (anterior = this.tabelaSimulacao[id - 1]) {
      t2 = t1 - anterior.tempoDeChegadaNoRelogio;
    } else {
      t2 = 0;
    }
    var linha = {
      posicao: id,
      tempoDeChegadaNoRelogio: t1,
      tempoDesdeAUltimaChegada: t2,
      tempoNaFilaCarregamento: null,
      tempoDoCarregamento: null,
      tempoNaFilaDePesagem: null,
      tempoDaPesagem: null,
      tempoDeViagem: null,
      tempoDoSistema: null,
      tempoLivreC1: null,
      tempoLivreC1: null,
      tempoLivrePesagem: null,
    }
    this.tabelaSimulacao[id] = linha;
    return linha;
  },

  atualizarLinha: function(linha) {
    this.tabelaSimulacao[linha.id] = linha;
  },

  inicializarVariaveis: function() {
    this.maiorTempoNaFilaCarregamento = this.tabelaSimulacao[0].tempoNaFilaCarregamento;
    this.menorTempoNaFilaCarregamento = this.tabelaSimulacao[0].tempoNaFilaCarregamento;
    this.maiorTempoDoCarregamento = this.tabelaSimulacao[0].tempoDoCarregamento;
    this.menorTempoDoCarregamento = this.tabelaSimulacao[0].tempoDoCarregamento;
    this.menorTempoNaFilaDePesagem = this.tabelaSimulacao[0].tempoNaFilaDePesagem;
    this.maiorTempoNaFilaDePesagem = this.tabelaSimulacao[0].tempoNaFilaDePesagem;;
    this.menorTempoDaPesagem = this.tabelaSimulacao[0].tempoDaPesagem;
    this.maiorTempoDaPesagem = this.tabelaSimulacao[0].tempoDaPesagem;
    this.menorTempoDeViagem = this.tabelaSimulacao[0].tempoDaViagem;
    this.maiorTempoDeViagem = this.tabelaSimulacao[0].tempoDaViagem;
    this.menorTempoDoSistema = this.tabelaSimulacao[0].tempoDoSistema;
    this.maiorTempoDoSistema = this.tabelaSimulacao[0].tempoDoSistema;

    this.maiorOcupacaoNaFilaCarregamento = this.tabelaOcupacao[0].fila1;
    this.menorOcupacaoNaFilaCarregamento = this.tabelaOcupacao[0].fila1;
    this.maiorOcupacaoDoCarregamento = this.tabelaOcupacao[0].carregamento;
    this.menorOcupacaoDoCarregamento = this.tabelaOcupacao[0].carregamento;
    this.menorOcupacaoNaFilaDePesagem = this.tabelaOcupacao[0].fila2;
    this.maiorOcupacaoNaFilaDePesagem = this.tabelaOcupacao[0].fila2;
    this.menorOcupacaoDaPesagem = this.tabelaOcupacao[0].pesagem;
    this.maiorOcupacaoDaPesagem = this.tabelaOcupacao[0].pesagem;
    this.menorOcupacaoDeViagem = this.tabelaOcupacao[0].viagem;
    this.maiorOcupacaoDeViagem = this.tabelaOcupacao[0].viagem;

    this.variaveisInicializadas = true;
  },

  calcularTemposMedios: function() {
    var totalTempoNaFilaCarregamento = 0;
    var totalTempoDoCarregamento = 0;
    var totalTempoNaFilaDePesagem = 0;
    var totalTempoDaPesagem = 0;
    var totalTempoDeViagem = 0;
    var totalTempoDoSistema = 0;
    this.viagensConcluidas = 0;

    for (linha in this.tabelaSimulacao) {
      totalTempoNaFilaCarregamento = totalTempoNaFilaCarregamento + this.tabelaSimulacao[linha].tempoNaFilaCarregamento;
      if (this.tabelaSimulacao[linha].tempoNaFilaCarregamento != null && this.menorTempoNaFilaCarregamento == null) this.menorTempoNaFilaCarregamento = this.tabelaSimulacao[linha].tempoNaFilaCarregamento;
      if (this.tabelaSimulacao[linha].tempoNaFilaCarregamento != null && this.tabelaSimulacao[linha].tempoNaFilaCarregamento > this.maiorTempoNaFilaCarregamento) this.maiorTempoNaFilaCarregamento = this.tabelaSimulacao[linha].tempoNaFilaCarregamento
      if (this.tabelaSimulacao[linha].tempoNaFilaCarregamento != null && this.tabelaSimulacao[linha].tempoNaFilaCarregamento < this.menorTempoNaFilaCarregamento) this.menorTempoNaFilaCarregamento = this.tabelaSimulacao[linha].tempoNaFilaCarregamento
      totalTempoDoCarregamento = totalTempoDoCarregamento + this.tabelaSimulacao[linha].tempoDoCarregamento;
      if (this.tabelaSimulacao[linha].tempoDoCarregamento != null && this.menorTempoDoCarregamento == null) this.menorTempoDoCarregamento = this.tabelaSimulacao[linha].tempoDoCarregamento;
      if (this.tabelaSimulacao[linha].tempoDoCarregamento != null && this.tabelaSimulacao[linha].tempoDoCarregamento > this.maiorTempoDoCarregamento) this.maiorTempoDoCarregamento = this.tabelaSimulacao[linha].tempoDoCarregamento;
      if (this.tabelaSimulacao[linha].tempoDoCarregamento != null && this.tabelaSimulacao[linha].tempoDoCarregamento < this.menorTempoDoCarregamento) this.menorTempoDoCarregamento = this.tabelaSimulacao[linha].tempoDoCarregamento;
      totalTempoNaFilaDePesagem = totalTempoNaFilaDePesagem + this.tabelaSimulacao[linha].tempoNaFilaDePesagem;
      if (this.tabelaSimulacao[linha].tempoNaFilaDePesagem != null && this.menorTempoNaFilaDePesagem == null) this.menorTempoNaFilaDePesagem = this.tabelaSimulacao[linha].tempoNaFilaDePesagem
      if (this.tabelaSimulacao[linha].tempoNaFilaDePesagem != null && this.tabelaSimulacao[linha].tempoNaFilaDePesagem > this.maiorTempoNaFilaDePesagem) this.maiorTempoNaFilaDePesagem = this.tabelaSimulacao[linha].tempoNaFilaDePesagem;
      if (this.tabelaSimulacao[linha].tempoNaFilaDePesagem != null && this.tabelaSimulacao[linha].tempoNaFilaDePesagem < this.menorTempoNaFilaDePesagem) this.menorTempoNaFilaDePesagem = this.tabelaSimulacao[linha].tempoNaFilaDePesagem;
      totalTempoDaPesagem = totalTempoDaPesagem + this.tabelaSimulacao[linha].tempoDaPesagem;
      if (this.tabelaSimulacao[linha].tempoDaPesagem != null && this.tempoDaPesagem == null) this.tempoDaPesagem = this.tabelaSimulacao[linha].tempoDaPesagem;
      if (this.tabelaSimulacao[linha].tempoDaPesagem != null && this.tabelaSimulacao[linha].tempoDaPesagem > this.maiorTempoDaPesagem) this.maiorTempoDaPesagem = this.tabelaSimulacao[linha].tempoDaPesagem;
      if (this.tabelaSimulacao[linha].tempoDaPesagem != null && this.tabelaSimulacao[linha].tempoDaPesagem < this.menorTempoDaPesagem) this.menorTempoDaPesagem = this.tabelaSimulacao[linha].tempoDaPesagem;
      totalTempoDeViagem = totalTempoDeViagem + this.tabelaSimulacao[linha].tempoDeViagem;
      if (this.tabelaSimulacao[linha].tempoDeViagem != null && this.tempoDeViagem == null) this.tempoDeViagem = this.tabelaSimulacao[linha].tempoDeViagem;
      if (this.tabelaSimulacao[linha].tempoDeViagem != null && this.tabelaSimulacao[linha].tempoDeViagem > this.maiorTempoDeViagem) this.maiorTempoDeViagem = this.tabelaSimulacao[linha].tempoDeViagem;
      if (this.tabelaSimulacao[linha].tempoDeViagem != null && this.tabelaSimulacao[linha].tempoDeViagem < this.menorTempoDeViagem) this.menorTempoDeViagem = this.tabelaSimulacao[linha].tempoDeViagem;
       totalTempoDoSistema = totalTempoDoSistema + this.tabelaSimulacao[linha].tempoDoSistema;
      if (this.tabelaSimulacao[linha].tempoDoSistema != null && this.menorTempoDoSistema === null) this.menorTempoDoSistema = this.tabelaSimulacao[linha].tempoDoSistema; 
      if (this.tabelaSimulacao[linha].tempoDoSistema != null && this.tabelaSimulacao[linha].tempoDoSistema > this.maiorTempoDoSistema) this.maiorTempoDoSistema = this.tabelaSimulacao[linha].tempoDoSistema;
      if (this.tabelaSimulacao[linha].tempoDoSistema != null && this.tabelaSimulacao[linha].tempoDoSistema < this.menorTempoDoSistema) this.menorTempoDoSistema = this.tabelaSimulacao[linha].tempoDoSistema;
      if (this.tabelaSimulacao[linha].tempoDoSistema != null) this.viagensConcluidas++;
    };
    this.mediaTempoNaFilaCarregamento = (totalTempoNaFilaCarregamento/this.tabelaSimulacao.length);
    this.mediaTempoDoCarregamento = (totalTempoDoCarregamento/this.tabelaSimulacao.length);
    this.mediaTempoNaFilaDePesagem = (totalTempoNaFilaDePesagem/this.tabelaSimulacao.length);
    this.mediaTempoDaPesagem = (totalTempoDaPesagem/this.tabelaSimulacao.length);
    this.mediaTempoDeViagem = (totalTempoDeViagem/this.tabelaSimulacao.length);
    this.mediaTempoDoSistema = (totalTempoDoSistema/this.viagensConcluidas);

  },

  calcularOcupacoes: function() {
    var totalOcupacaoNaFilaCarregamento = 0;
    var totalOcupacaoDoCarregamento = 0;
    var totalOcupacaoNaFilaDePesagem = 0;
    var totalOcupacaoDaPesagem = 0;
    var totalOcupacaoDeViagem = 0;

    for (linha in this.tabelaOcupacao) {
      totalOcupacaoNaFilaCarregamento = totalOcupacaoNaFilaCarregamento + this.tabelaOcupacao[linha].fila1;
      if (this.tabelaOcupacao[linha].fila1 > this.maiorOcupacaoNaFilaCarregamento) this.maiorOcupacaoNaFilaCarregamento = this.tabelaOcupacao[linha].fila1
      if (this.tabelaOcupacao[linha].fila1 < this.menorOcupacaoNaFilaCarregamento) this.menorOcupacaoNaFilaCarregamento = this.tabelaOcupacao[linha].fila1
      totalOcupacaoDoCarregamento = totalOcupacaoDoCarregamento + this.tabelaOcupacao[linha].carregamento;
      if (this.tabelaOcupacao[linha].carregamento > this.maiorOcupacaoDoCarregamento) this.maiorOcupacaoDoCarregamento = this.tabelaOcupacao[linha].carregamento;
      if (this.tabelaOcupacao[linha].carregamento < this.menorOcupacaoDoCarregamento) this.menorOcupacaoDoCarregamento = this.tabelaOcupacao[linha].carregamento;
      totalOcupacaoNaFilaDePesagem = totalOcupacaoNaFilaDePesagem + this.tabelaOcupacao[linha].fila2;
      if (this.tabelaOcupacao[linha].fila2 > this.maiorOcupacaoNaFilaDePesagem) this.maiorOcupacaoNaFilaDePesagem = this.tabelaOcupacao[linha].fila2;
      if (this.tabelaOcupacao[linha].fila2 < this.menorOcupacaoNaFilaDePesagem) this.menorOcupacaoNaFilaDePesagem = this.tabelaOcupacao[linha].fila2;
      totalOcupacaoDaPesagem = totalOcupacaoDaPesagem + this.tabelaOcupacao[linha].pesagem;
      if (this.tabelaOcupacao[linha].pesagem > this.maiorOcupacaoDaPesagem) this.maiorOcupacaoDaPesagem = this.tabelaOcupacao[linha].pesagem;
      if (this.tabelaOcupacao[linha].pesagem < this.menorOcupacaoDaPesagem) this.menorOcupacaoDaPesagem = this.tabelaOcupacao[linha].pesagem;
      totalOcupacaoDeViagem = totalOcupacaoDeViagem + this.tabelaOcupacao[linha].viagem;
      if (this.tabelaOcupacao[linha].viagem > this.maiorOcupacaoDeViagem) this.maiorOcupacaoDeViagem = this.tabelaOcupacao[linha].viagem;
      if (this.tabelaOcupacao[linha].viagem < this.menorOcupacaoDeViagem) this.menorOcupacaoDeViagem = this.tabelaOcupacao[linha].viagem;
    };
    this.mediaOcupacaoNaFilaCarregamento = (totalOcupacaoNaFilaCarregamento/this.tabelaOcupacao.length);
    this.mediaOcupacaoDoCarregamento = (totalOcupacaoDoCarregamento/this.tabelaOcupacao.length);
    this.mediaOcupacaoNaFilaDePesagem = (totalOcupacaoNaFilaDePesagem/this.tabelaOcupacao.length);
    this.mediaOcupacaoDaPesagem = (totalOcupacaoDaPesagem/this.tabelaOcupacao.length);
    this.mediaOcupacaoDeViagem = (totalOcupacaoDeViagem/this.tabelaOcupacao.length);
  },

  renderNumeroEntidades: function() {
    var $grafico1 = this.$el.find('#recursos-alocados');
    this.grafico1 = new Chart($grafico1, {
          type: 'pie',
          data: {
              labels: ["Fila Carregamento", "Carregamento", "Fila Pesagem", "Pesagem", "Viagem"],
              datasets: [{
                  data: [this.collection.listaFilaCarregamento.length, (this.collection.carregamentoC2 + this.collection.carregamentoC1),
                  this.collection.listaFilaPesagem.length, this.collection.pesagem, this.collection.viagem],
                  backgroundColor: [
                      "#050F15",
                      "#1A4C6D",
                      "#3498DB",
                      "#85C1E9",
                      "#C2E0F4"
                  ],
              }]
          },
      });
  },

  renderTempoMedio: function() {
    var $grafico2 = this.$el.find('#distribuicao-media');
    this.grafico2 = new Chart($grafico2, {
          type: 'pie',
          data: {
              labels: ["Fila Carregamento", "Carregamento", "Fila Pesagem", "Pesagem", "Viagem"],
              datasets: [{
                  data: [this.mediaTempoNaFilaCarregamento, this.mediaTempoDoCarregamento, 
                  this.mediaTempoNaFilaDePesagem, this.mediaTempoDaPesagem, this.mediaTempoDeViagem],
                  backgroundColor: [
                      "#050F15",
                      "#1A4C6D",
                      "#3498DB",
                      "#85C1E9",
                      "#C2E0F4"
                  ],
              }]
          },
      });
  },

  renderAlocacaoMedio: function() {
    var $grafico3 = this.$el.find('#alocacao-media');
    this.grafico3 = new Chart($grafico3, {
          type: 'pie',
          data: {
              labels: ["Fila Carregamento", "Carregamento", "Fila Pesagem", "Pesagem", "Viagem"],
              datasets: [{
                  data: [this.mediaOcupacaoNaFilaCarregamento, this.mediaOcupacaoDoCarregamento, 
                  this.mediaOcupacaoNaFilaDePesagem, this.mediaOcupacaoDaPesagem, this.mediaOcupacaoDeViagem],
                  backgroundColor: [
                      "#050F15",
                      "#1A4C6D",
                      "#3498DB",
                      "#85C1E9",
                      "#C2E0F4"
                  ],
              }]
          },
      });
  },

  atualizarGraficos: function() {
    if (!this.variaveisInicializadas && (this.tabelaSimulacao.length > 0) && (this.tabelaOcupacao.length > 0) ) {
      this.inicializarVariaveis();
    }

    if (this.tabelaSimulacao.length > 0) {
      this.calcularTemposMedios();
    }
    if (this.tabelaOcupacao.length > 0) {
      this.calcularOcupacoes();
    }

    this.$el.find('#entidades').html(this.options.entidades);
    this.$el.find('#viagens').html(this.viagensConcluidas);

    if (this.menorTempoNaFilaCarregamento != null && this.maiorTempoNaFilaCarregamento != null) {
      this.$el.find('#entidade-fila-carregamento-min').html(this.menorTempoNaFilaCarregamento.toFixed(2));
      this.$el.find('#entidade-fila-carregamento-med').html(this.mediaTempoNaFilaCarregamento.toFixed(2));
      this.$el.find('#entidade-fila-carregamento-max').html(this.maiorTempoNaFilaCarregamento.toFixed(2));
    }
    
    if (this.menorTempoNaFilaDePesagem != null && this.maiorTempoNaFilaDePesagem != null) {
      this.$el.find('#entidade-fila-pesagem-min').html(this.menorTempoNaFilaDePesagem.toFixed(2));
      this.$el.find('#entidade-fila-pesagem-med').html(this.mediaTempoNaFilaDePesagem.toFixed(2));
      this.$el.find('#entidade-fila-pesagem-max').html(this.maiorTempoNaFilaDePesagem.toFixed(2));
    }

    if (this.menorOcupacaoNaFilaCarregamento != null) {
      this.$el.find('#fila-carregamento-min').html(this.menorOcupacaoNaFilaCarregamento.toFixed(2));
      this.$el.find('#fila-carregamento-med').html(this.mediaOcupacaoNaFilaCarregamento.toFixed(2));
      this.$el.find('#fila-carregamento-max').html(this.maiorOcupacaoNaFilaCarregamento.toFixed(2));
    }

    if (this.menorOcupacaoNaFilaDePesagem != null) {
      this.$el.find('#fila-pesagem-min').html(this.menorOcupacaoNaFilaDePesagem.toFixed(2));
      this.$el.find('#fila-pesagem-med').html(this.mediaOcupacaoNaFilaDePesagem.toFixed(2));
      this.$el.find('#fila-pesagem-max').html(this.maiorOcupacaoNaFilaDePesagem.toFixed(2));
    }

    if (this.menorOcupacaoDoCarregamento != null) {
      this.$el.find('#carregamento-min').html(this.menorOcupacaoDoCarregamento.toFixed(2));
      this.$el.find('#carregamento-med').html(this.mediaOcupacaoDoCarregamento.toFixed(2));
      this.$el.find('#carregamento-max').html(this.maiorOcupacaoDoCarregamento.toFixed(2));
    }

    if (this.menorOcupacaoDaPesagem != null) {
      this.$el.find('#pesagem-min').html(this.menorOcupacaoDaPesagem.toFixed(2));
      this.$el.find('#pesagem-med').html(this.mediaOcupacaoDaPesagem.toFixed(2));
      this.$el.find('#pesagem-max').html(this.maiorOcupacaoDaPesagem.toFixed(2));
    }

    if (this.menorTempoDoSistema != null) {
      this.$el.find('#ciclo-min').html(this.menorTempoDoSistema.toFixed(2));
      this.$el.find('#ciclo-med').html(this.mediaTempoDoSistema.toFixed(2));
      this.$el.find('#ciclo-max').html(this.maiorTempoDoSistema.toFixed(2));
    }

    this.grafico1.data.datasets[0].data[0] = this.collection.listaFilaCarregamento.length;
    this.grafico1.data.datasets[0].data[2] = this.collection.listaFilaPesagem.length;
    this.grafico1.data.datasets[0].data[1] = (this.collection.carregamentoC2.length + this.collection.carregamentoC1.length);
    this.grafico1.data.datasets[0].data[3] = this.collection.pesagem.length;
    this.grafico1.data.datasets[0].data[4] = this.collection.viagem.length;
    this.grafico1.update();

    this.grafico2.data.datasets[0].data[0] = this.mediaTempoNaFilaCarregamento;
    this.grafico2.data.datasets[0].data[1] = this.mediaTempoDoCarregamento;
    this.grafico2.data.datasets[0].data[2] = this.mediaTempoNaFilaDePesagem;
    this.grafico2.data.datasets[0].data[3] = this.mediaTempoDaPesagem;
    this.grafico2.data.datasets[0].data[4] = this.mediaTempoDeViagem;
    this.grafico2.update();

    this.grafico3.data.datasets[0].data[0] = this.mediaOcupacaoNaFilaCarregamento;
    this.grafico3.data.datasets[0].data[1] = this.mediaOcupacaoDoCarregamento;
    this.grafico3.data.datasets[0].data[2] = this.mediaOcupacaoNaFilaDePesagem;
    this.grafico3.data.datasets[0].data[3] = this.mediaOcupacaoDaPesagem;
    this.grafico3.data.datasets[0].data[4] = this.mediaOcupacaoDeViagem;
    this.grafico3.update();
  }
})