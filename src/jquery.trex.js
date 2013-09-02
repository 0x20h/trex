;(function($, window, document, undefined) {

	var pluginName = "trex",
			defaults = {
				/**
				 * Playback speed. Larger values slow down playback,
				 * smaller values speed playback up. (speed > 0)
				 */
				speed: 1,	
			};
	
	function Trex(element, options) {
		this.element = element;
		this.settings = $.extend({}, defaults, options);
		this._defaults = defaults;
		this._name = pluginName;
		this.init();
	}

	Trex.prototype = {
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
					self.term = new Terminal({
						cols: parseInt(data.cols),
						rows: parseInt(data.rows),
						useStyle: true,
						screenKeys: false
					});

					self.term.open(self.element);
					self.script = data.script;
					self.timing = data.timing;
					self.player = {
						current: 0,
						// ignore first line of the script file
						offset: data.script.indexOf("\n")
					};
					self.tick();
				}
			);
		},

		tick: function() {
			var self = this;

			if (!this.timing[this.player.current]) {
				return;
			}

			var element = this.timing[this.player.current++];
			
			setTimeout(function() {
				var count = parseInt(element[1])
				var content = self.script.substr(self.player.offset, count)

				self.player.offset += count;
				self.term.write(content);
				self.tick();
			}, element[0] * 1000 * this.settings.speed)
		},
	};

	$.fn[pluginName] = function (options) {
		return this.each(function() {
			if (!$.data(this, "plugin_" + pluginName)) {
				$.data(this, "plugin_" + pluginName, new Trex(this, options));
			}
		});
	};
})(jQuery, window, document);
