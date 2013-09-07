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
		this.wrapper = $('<div class="terminal-container"></div>');
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

			// check playback index	
			if (this.timing.length <= this.player.current) {
				return;
			}
			
			var delay = this.timing[this.player.current][0];
			var update = function() {
				var count = 0;
				// move #ticks ticks forward
				for (var i = 0; i < ticks; i++) {
					var element = self.timing[self.player.current++];
					// count bytes to write
					count += parseInt(element[1])
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
				current: 0,
				// ignore first line of the script file
				offset: this.script.indexOf("\n"),
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
			this.reset();
			this.tick(index);
		},

		/**
		 * Toggle playmode (play/pause).
		 */
		toggle: function() {
			this.player.playing = !this.player.playing;

			if (this.player.playing) {
				this.tick();
			}

			this.term.focus();
		},
		
		/**
		 * initialize player controls
		 */
		initControls: function() {
			var self = this,
					fadeout_controls_timer;

			var controls = $('<div class="terminal-controls"></div>').
				css({
					backgroundColor: '#000',
					height: '1.5em'
				});

			// initialize player controls
			this.controls['pause'] = $('<div>Play</div>').
				css({
					width: '10%',
					height:'100%',
					float: 'left',
					color: '#FFF',
					padding: '.25em 0 0 .25em'
				}).
				bind('click', function() {
					self.toggle();
					$(this).text(self.player.playing ? 'pause' : 'play');
			});


			this.controls['sliderWrapper'] = $('<div></div>').
				css({
					float:'left',
					backgroundColor:'#FFF',
					height:'.27em',
					width:'88%',
					left:'10%',
					margin:'0 0 0 1%',
					position:'absolute',
					cursor:'pointer',
					top:'50%'
				}).
				bind('mousedown', function(e) {
					var el = self.controls.sliderWrapper;
							// compute the corresponding timing index position
							// substract 10 to point exactly to the "finger"
							pos = parseInt(((e.clientX - el.position().left - 10) / el.outerWidth()) * self.timing.length);
					
					self.jump(pos);
			});

			this.controls['slider'] = $('<div></div>').
				css({
					backgroundColor:'red',
					height:'100%',
					width:'0%',
					left:'0',
				});

			this.controls.sliderWrapper.append(this.controls.slider);
			
			controls
				.append(this.controls.pause)
				.append(this.controls.sliderWrapper);

			this.wrapper.prepend(controls);
			
			this.element.bind('mouseenter', function() {
				clearTimeout(fadeout_controls_timer);
				controls.fadeIn('fast');
			}).bind('mouseleave', function() {
				fadeout_controls_timer = setTimeout(function() {
					controls.fadeOut('slow');
				}, 600);
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
