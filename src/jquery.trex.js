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
			this.session = $(this.element).data('session');

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
				self.controls.slider.slider('value', self.player.current)	

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
				playing: this.settings.auto_start
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
			var self = this;

			var controls = $('<div class="terminal-controls"></div>');

			// initialize player controls
			this.controls['pause'] = $('<input class="pause" value="' + 
				(this.player.playing ? 'pause' : 'play') + 
				'" type="button"/>'
			).bind('click', function() {
					self.toggle();
					this.value = self.player.playing ? 'pause' : 'play';
			});

			this.controls['slider'] = $('<div></div>').slider({
				value: 0,
				min: 0,
				max: this.timing.length,
				step: 1,
				slide: function(event, ui) {
					self.jump(ui.value);
					pause.val(self.player.playing ? 'pause' : 'play');
				}
			});

			var faster = $('<input value="+" type="button"/>')
				.bind('click', function() {
					self.settings.speed = self.settings.speed > .25 
						? self.settings.speed / 2 
						: .25;
					self.term.focus();
			});

			var slower = $('<input value="-" type="button"/>')
				.bind('click', function() {
					self.settings.speed = self.settings.speed < 2 
						? self.settings.speed * 2 
						: 2; 
					self.term.focus();
			});
			
			controls
				.append(this.controls.pause)
				.append(this.controls.slider);

			this.wrapper.prepend(controls);
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
