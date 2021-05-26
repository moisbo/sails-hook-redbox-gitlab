var gulp = require('gulp'),
	i18next = require('i18next-parser');

gulp.task('i18next', function () {
	gulp.src(['src/**/*.html', 'src/*.html', 'src/locales/I18nModule.ts'])
		.pipe(i18next({
			locales: ['en'],
			output: '../src/locales',

			// The workaround (i18next-parser does not support "namespaceSeparator === false" flag):
			//      options.namespaceSeparator || ':';
			//      options.keySeparator || '.';
			keySeparator: "eb6c8400-b5f8-4177-a417-5e5e902a6c83",
			namespaceSeparator: "eb6c8400-b5f8-4177-a417-5e5e902a6c83",

			// Supported patterns:
			//      1) The gettext format like << 'Hello {{count}} world!' | translate:{count: 100} >>
			//      2) The I18nModule format like << static YOUR_CONSTANT:string = "Your value..."; >>
			//      3) The inner html format << <div [innerHTML]='"<span style=\"color:red;\">You have {count} apple</span>" | translate:{count: appleCount}'></div> >>
			parser: '\'(.+)\'.+translate|static [A-Z_0-9 ]+\: {0,}string \= ["|\'](.+)["|\']|\\[innerHTML\\]\=\'\"(.+)\" +\\|'
		}))
		.pipe(gulp.dest('src/locales'));
});