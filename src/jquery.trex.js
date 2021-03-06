/*!
 * trex - html5 player for terminal sessions based on term.js.
 * Copyright (c) 2013 Jan Kohlhof <kohj@informatik.uni-marburg.de>
 */
;(function($, window, document, undefined) {

  var pluginName = "trex",
      defaults = {
        /**
         * Playback speed. Larger values slow down playback,
         * smaller values speed playback up. (speed > 0)
         */
        speed: 1,
        /**
         * Automatically start playing when initialized.
         */
        auto_start: false
      };


  function Trex(element, options) {
    this.element = $(element);
    this.wrapper = $('<div class="trex-wrapper"></div>');
    this.element.append(this.wrapper);
    this.settings = $.extend({}, defaults, options);
    this._defaults = defaults;
    this._name = pluginName;
    this.controls = {};
    this.timer = undefined;
    this.init();
  }

  Trex.prototype = {
    /**
     * Initialize the element, the Terminal emulator and the
     * player.
     */
    init: function() {
      var self = this;
      // read which session to load
      this.session = this.element.data('session');
      this.index = [];

      if (!this.session) {
        console.error('Please provide a session name via the' +
          'data-session property.');
        return;
      }

      $.getJSON(this.session, {},
        function(data) {
          self.chunks = data.chunks;
          self.elapsed = self.chunks.reduce(
            function(p,c) {
              return p.concat(Number(p[p.length - 1]) + Number(c[0]));
            },
            [0]
          );
          
          var acc = 0;
          self.chunks.forEach(function(v, k) {
            // store chunk index per second
            // @TODO handle gaps
            self.index[parseInt(acc += Number(v[0]), 10)] = k;
          });

          self.term = new Terminal({
            cols: parseInt(data.cols, 10),
            rows: parseInt(data.rows, 10),
            useStyle: true,
            screenKeys: false
          });

          self.term.open(self.wrapper.get(0));
          self.reset();
          self.initControls();

          if (self.settings.auto_start) {
            self.tick();
          }
        }
      );
    },

    /**
     * Move the player ticks forward and play.
     *
     * @param {Number} ticks Number of ticks to move forward [default=1]
     */
    tick: function(ticks) {
      var self = this;
      
      if (!ticks) {
        ticks = 1;
      }

      // check playback index. Are we at the end of the script?
      if (this.chunks.length <= this.player.current) {
        clearTimeout(this.timer);
        
        if (this.player.playing) {
          this.toggle();
        }
        
        return;
      }
      
      var delay = this.chunks[this.player.current][0];

      var update = function() {
        var buffer = '';
        // move #ticks ticks forward
        for (var i = 0; i < ticks; i++) {
          var element = self.chunks[self.player.current++];
          // collect bytes to write
          buffer += element[1];
        }

        self.term.write(buffer);
        self.element.trigger("tick", [self.player.current]);
        
        if (self.player.playing) {
          self.tick();
        }
      };

      clearTimeout(this.timer);
      
      this.timer = setTimeout(
        update,
        ticks > 1 ? 0 : delay * 1000 * this.settings.speed
      );
    },
    

    /**
     * Reset player.
     */
    reset: function() {
      this.player = {
        // current timing index
        current: 0,
        // player state
        playing: this.player ? this.player.playing : false
      };

      // clear pending timeouts
      clearTimeout(this.timer);
      this.term.reset();
    },

    /**
     * move the player to the given position.
     *
     * @param {Number} index The target index.
     */
    jump: function(index) {
      if (index < this.player.current) {
        this.reset();
      } else {
        index = index - this.player.current;
      }

      this.tick(index);
    },

    /**
     * Toggle playmode (play/pause).
     */
    toggle: function() {
      this.player.playing = !this.player.playing;
      
      if (this.player.playing) {
        if (this.chunks.length - 1 <= this.player.current) {
          this.jump(0);
        } else {
          this.tick();
        }
      }

      this.element.trigger('toggle');
    },
    
    /**
     * initialize player controls
     */
    initControls: function() {
      var self = this,
          last_move = 0,
          doc = $(document);

      this._initPlayButton();
      this._initSlider();
      this._initFullscreen();
      this._initTimeInfo();

      var controls = $('<div class="terminal-controls"></div>').
        append(this.controls.play_pause).
        //append(this.controls.expand).
        append(this.controls.sliderWrapper).
        append(this.controls.time_info);

      this.wrapper.prepend(controls);

      // show/hide controls
      this.element.on('mouseenter', function() {
        clearTimeout(self.controls.fadeout_controls_timer);
        controls.fadeIn('fast');
      }).on('mouseleave', function() {
        self.controls.fadeout_controls_timer = setTimeout(function() {
          controls.fadeOut('slow');
        }, 1200);
      }).on('click', function() {
        self.toggle();
      });
    },
/**
 * Initialize Play/Pause control.
 */
    _initPlayButton: function() {
      var self = this;
      
      // initialize player controls
      this.controls.play_pause = $('<div class="play trex-sprite play-controls"></div>');

      this.element.on('toggle', function(e) {
          self.controls.play_pause.toggleClass('pause').toggleClass( 'play');
      });
    },

/**
 * Initialize "elapsed time" control.
 */
    _initTimeInfo: function() {
      var self = this,
          total = this.elapsed[this.elapsed.length - 1],
          elapsed = this.elapsed[this.player.current],
          format = function(sec) {
          
            var sec_num = parseInt(sec, 10); // don't forget the second parm
            var minutes = Math.floor(sec_num / 60);
            var seconds = sec_num - (minutes * 60);

            if (minutes < 10) {minutes = "0"+minutes;}
            if (seconds < 10) {seconds = "0"+seconds;}
            return minutes + ':' + seconds;
          };

      this.controls.time_info = $('<div class="time-info"><span class="elapsed">' + format(elapsed) +'</span>/'+format(total)+'</div>');
      // update timer
      setInterval(function() {
        self.controls.time_info.find('.elapsed').text(format(self.elapsed[self.player.current]));
      }, 1000);
    },


/**
 * Initialize slider control.
 */
    _initSlider: function() {
      var self = this,
          last_move = 0,
          doc = $(document),
          player_state;

      var onMove = function(e) {
        var now = Date.now(),
            update = now - last_move > 50;

        last_move = update ? now : last_move;

        // clear frame timer
        clearTimeout(this.timer);

        // update the terminal at most every 50msecs
        if (!update) {
          return;
        }

        // don't hide controls during slide  
        // @TODO implement slide event and use a callback
        clearTimeout(self.controls.fadeout_controls_timer);

        var el = self.controls.sliderWrapper,
            // compute the corresponding timing index position
            // substract 10 to point exactly to the "finger"
            offset = ((e.originalEvent.clientX - el.position().left) / el.width());

        if (offset < 0) offset = 0;
        if (offset > 1) offset = 1;

        self.jump(parseInt(offset * self.chunks.length, 10));
      };

      var onStop = function(e) {  
        doc.
          off('mousemove', onMove).
          off('mouseup', onStop).
          css({cursor: 'auto'});

        self.player.playing = player_state;

        if (self.player.playing) {
          self.tick();
        }
      };

      this.controls.sliderWrapper = $('<div class="slider-wrapper"></div>').
        on('click', function(e) { onMove(e); }).
        on('mousedown', function(e) {
          // stop player when sliding  
          player_state = self.player.playing;
          self.player.playing = false;

          doc.
            css({
              cursor: 'pointer'
            }).
            on('mousemove', onMove).
            on('mouseup', onStop);
        });

      this.controls.slider = $('<div class="slider"></div>');
      this.controls.sliderWrapper.append(this.controls.slider);

      this.element.on("tick", function(e, pos) {
        //var p = self.index.indexOf(pos);
        // update slider pos
        self.controls.slider.css({
          width: parseInt(pos / self.chunks.length * 100, 10) + '%'
        });
      });
    },

/**
 * Initialize fullscreen control.
 */
    _initFullscreen: function() {
      var self = this;
      this.controls.expand = $('<div class="expand screen-controls trex-sprite"></div>').
        on('click', function() {
          var container = self.element.get(0),
              el = $(this);
              

          if (el.hasClass('expand')) {
            el.toggleClass('expand').toggleClass('shrink');
            
            if (container.requestFullscreen) {
                container.requestFullscreen();
            } else if (container.mozRequestFullScreen) {
                container.mozRequestFullScreen();
            } else if (container.webkitRequestFullscreen) {
                container.webkitRequestFullscreen();
            }
          
            if (!self.player.playing) {
              self.toggle();
            }
          } else {
            el.toggleClass('expand').toggleClass('shrink');
          }

        });
    }
  };

  $.fn[pluginName] = function (options) {
    return this.each(function() {
      if (!$.data(this, "plugin_" + pluginName)) {
        $.data(this, "plugin_" + pluginName, new Trex(this, options));
      }
    });
  };
})(jQuery, window, document);
