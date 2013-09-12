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
				files: {
					'build/jquery.trex.min.js': 'src/jquery.trex.js',
					'build/term.min.js': 'node_modules/term.js/src/term.js'
				}
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
		},
		csslint: {
			lax: {
				options: {
					import: null
				},
				src: ['src/*css'],
			}
		}
	});
	
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-csslint');
	
	// register default task
	grunt.registerTask('default', ['jshint', 'csslint', 'uglify', 'cssmin']);	
};
