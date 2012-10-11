
#---- Files

JSSTYLE_FILES := $(shell find lib tools -name "*.js")



#---- Targets

all:

.PHONY: cutarelease
cutarelease:
	[[ `git status | tail -n1` == "nothing to commit (working directory clean)" ]]
	./tools/cutarelease.py -p ruhroh -f package.json


#---- test

.PHONY: test
test:
	echo "no tests yet :("

# Test will all node supported versions (presumes install locations I use on my machine).
.PHONY: testall
testall: test08 test06 test09

.PHONY: test09
test09:
	@echo "# Test node 0.9.x (with node `$(HOME)/opt/node-0.9/bin/node --version`)"
	echo "no tests yet :("
.PHONY: test08
test08:
	@echo "# Test node 0.8.x (with node `$(HOME)/opt/node-0.8/bin/node --version`)"
	echo "no tests yet :("
.PHONY: test06
test06:
	@echo "# Test node 0.6.x (with node `$(HOME)/opt/node-0.6/bin/node --version`)"
	echo "no tests yet :("



#---- check

.PHONY: check-jsstyle
check-jsstyle: $(JSSTYLE_FILES)
	./tools/jsstyle -o indent=4,doxygen,unparenthesized-return=0,blank-after-start-comment=0,leading-right-paren-ok $(JSSTYLE_FILES)

.PHONY: check
check: check-jsstyle
	@echo "Check ok."

.PHONY: prepush
prepush: check testall
	@echo "Okay to push."
