import jenkins.model.*
import hudson.model.*

println "---> Creating sample Jenkins jobs"

def jenkins = Jenkins.instance

// Job 1: Simple echo job
job('Sample-Echo-Job') {
    description('A simple job that prints a message.')
    steps {
        shell('echo "Hello from Sample-Echo-Job!"')
        shell('sleep 10')
        shell('echo "Still working..."')
        shell('sleep 10')
        shell('echo "Finished Sample-Echo-Job!"')
    }
}

// Job 2: Job that sometimes fails
job('Sample-Failure-Job') {
    description('A job designed to fail occasionally.')
    steps {
        shell('echo "Starting Sample-Failure-Job..."')
        shell('sleep 5')
        shell('echo "Checking random condition..."')
        shell('if [ $((RANDOM % 2)) -eq 0 ]; then echo \"Job succeeded!\"; else echo \"Job failed!\"; exit 1; fi')
    }
}

// Job 3: Parameterized job
job('Sample-Param-Job') {
    description('A job that accepts parameters.')
    parameters {
        stringParam('MESSAGE', 'Default message', 'Message to print during the build.')
        choiceParam('DELAY', ['5', '10', '15'], 'Seconds to sleep.')
    }
    steps {
        shell('echo "Running Sample-Param-Job..."')
        shell('echo "Message: $MESSAGE"')
        shell('echo "Sleeping for $DELAY seconds..."')
        shell('sleep $DELAY')
        shell('echo "Finished Sample-Param-Job!"')
    }
}

println "---> Sample Jenkins jobs created"

// Ensure changes are saved
jenkins.save() 