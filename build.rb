require "fileutils"

def sh(cmd)
	# Print the command to stdout.
	if(cmd.is_a?(Array))
		p cmd
	else
		puts cmd
	end
	# run it.
	success = system(cmd)
	raise "Command failed" unless(success)
end

include FileUtils::Verbose

# Remove old builds.
rm_rf('build')
mkdir('build')

# Initialize cordova project.
sh('cordova create build com.evothings.proj-sparkfun SparkfunDemo')
rm_rf('build/www')
mkdir('build/www')

# Copy our files.
cp('index.html', 'build/www/index.html')
cp('index.css', 'build/www/index.css')
cp('index.js', 'build/www/index.js')

# Initialize android project.
cd('build')
sh('cordova platform add android')

# Remove big unused images.
rm(Dir.glob('platforms/android/res/**/screen.png'))

sh('cordova build')
