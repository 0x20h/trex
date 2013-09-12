module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		uglify: {
			options: {
				preserveComments: function(node, comment) {
					return comment.line == 1;
				}
			},
			build: {
				src: [
					'src/jquery.<%= pkg.name %>.js',
					'node_modules/term.js/src/term.js'
				],
				dest: 'build/jquery.trex.min.js'
			}
		},
		cssmin: {
			build: {
				src: 'src/jquery.trex.css',
				dest: 'build/jquery.trex.min.css'
			}
		},
		jshint: {
			all: ['src/jquery*js'],
		}
	});
	
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	
	// register default task
	grunt.registerTask('default', ['uglify', 'cssmin']);	
};
