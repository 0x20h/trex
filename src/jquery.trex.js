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
			this.session = $(this.element).attr('data-session');

			if (!this.session) {
				console.error('Please provide a session name via the' +
					'data-session property.');
				return;
			}

			$.getJSON(this.session, {},
				function(data) {
					self.script = data.script;
					self.timing = data.timing;

					self.term = new Terminal({
						cols: parseInt(data.cols),
						rows: parseInt(data.rows),
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
			var self = this,
					ticks = ticks || 1;

			// check playback index. Are we at the end of the script?
			if (this.timing.length <= this.player.current) {
				this.element.trigger('toggle');
				return;
			}
			
			var delay = this.timing[this.player.current][0];

			var update = function() {
				var count = 0;
				// move #ticks ticks forward
				for (var i = 0; i < ticks; i++) {
					// check playback index	
					if (self.timing.length <= self.player.current) {
						return;
					}

					var element = self.timing[self.player.current++];
					// count bytes to write
					count += parseInt(element[1]);
				}

				var content = self.script.substr(self.player.offset, count)
				self.player.offset += count;
				self.term.write(content);

				// update slider position
				self.controls.slider.css({
					width: parseInt(self.player.current / self.timing.length * 100) + '%'
				});

				if (self.player.playing) {
					self.tick();
				}
			};

			// fast-forward	
			if (ticks > 1) {
				update();
			} else {
				this.timer = setTimeout(
					update, 
					delay * 1000 * this.settings.speed
				);
			}
		},
		

		/**
		 * Reset player for the first position.
		 */
		reset: function() {
			this.player = {
				// current timing index
				current: 0,
				// byte count. Ignore first line of the script file
				offset: this.script.indexOf("\n"),
				// player state
				playing: false
			};

			// clear pending timeouts
			clearTimeout(this.timer);
			this.term.reset();
			this.term.focus();
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
				if (this.player.current == this.timing.length) {
					this.jump(0);

				} else {
					this.tick();
				}
			}

			this.term.focus();
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

			var controls = $('<div class="terminal-controls"></div>')
				.append(this.controls.play_pause)
				.append(this.controls.sliderWrapper);

			this.wrapper.prepend(controls);
			
			this.element.on('mouseenter', function() {
				clearTimeout(self.controls.fadeout_controls_timer);
				controls.fadeIn('fast');
			}).on('mouseleave', function() {
				self.controls.fadeout_controls_timer = setTimeout(function() {
					controls.fadeOut('slow');
				}, 1200);
			});
		},
/**
 * Initialize Play/Pause control.
 */
		_initPlayButton: function() {
			var self = this;
			
			// initialize player controls
			this.controls['play_pause'] = $('<div class="play"></div>').
				on('click', function() {
					self.toggle();
			});

			this.element.on('toggle', function(e) {
					self.controls['play_pause'].toggleClass('pause').toggleClass( 'play');
			});
		},

/**
 * Initialize slider control.
 */
		_initSlider: function() {
			var self = this,
					last_move = 0,
					doc = $(document),
					player_state;

			this.controls['sliderWrapper'] = $('<div class="slider-wrapper"></div>').
				on('click', function(e) { onMove(e) }).
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

			var onMove = function(e) {
				var now = Date.now(),
						// only update the terminal every 50msecs
						update = now - last_move > 50;

				last_move = update ? now : last_move;

				if (!update) {
					return;
				}

				// don't hide controls during slide	
				clearTimeout(self.controls.fadeout_controls_timer);

				var el = self.controls.sliderWrapper,
						// compute the corresponding timing index position
						// substract 10 to point exactly to the "finger"
						offset = ((e.originalEvent.clientX - el.position().left - 10) / el.width());

				if (offset < 0) offset = 0;
				if (offset > 1) offset = 1;

				self.jump(parseInt(offset * self.timing.length));
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

			this.controls['slider'] = $('<div class="slider"></div>');
			this.controls.sliderWrapper.append(this.controls.slider);
		},

/**
 * Initialize fullscreen control.
 */
		_initFullscreen: function() {

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
