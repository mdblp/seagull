#!/bin/sh -e

<<<<<<< HEAD
wget -q -O artifact_node.sh 'https://raw.githubusercontent.com/mdblp/tools/dbl/artifact/artifact_node.sh'
=======
wget -q -O artifact_node.sh 'https://raw.githubusercontent.com/tidepool-org/tools/master/artifact/artifact.sh'
>>>>>>> origin/master
chmod +x artifact_node.sh

. ./version.sh
./artifact_node.sh node
