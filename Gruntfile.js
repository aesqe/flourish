module.exports = function(grunt)
{
	grunt.initConfig({
		pkg: grunt.file.readJSON("package.json"),
		uglify: {
			build: {
				src: "src/<%= pkg.name %>.js",
				dest: "dist/<%= pkg.name %>-<%= pkg.version %>.min.js"
			}
		}
	});

	grunt.loadNpmTasks("grunt-contrib-uglify");
	grunt.registerTask("default", ["uglify"]);
};