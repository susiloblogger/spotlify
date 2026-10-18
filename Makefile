NAME = spotlify
UUID = spotlify@jenova
SCHEMA_DIR = schemas
EXTENSION_DIR = $(HOME)/.local/share/gnome-shell/extensions/$(UUID)

.PHONY: all schemas install uninstall test pack clean log

all: schemas

schemas:
	glib-compile-schemas --strict $(SCHEMA_DIR)/

install: schemas
	mkdir -p $(HOME)/.local/share/gnome-shell/extensions
	rm -rf $(EXTENSION_DIR)
	ln -s $(CURDIR) $(EXTENSION_DIR)
	@echo "Linked $(CURDIR) to $(EXTENSION_DIR)"

uninstall:
	rm -rf $(EXTENSION_DIR)
	@echo "Unlinked $(EXTENSION_DIR)"

test:
	gjs -m tests/lrcParser.test.js
	gjs -m tests/trackMatcher.test.js
	gjs -m tests/syncEngine.test.js
	gjs -m tests/coverArtLoader.test.js

pack:
	rm -f $(SCHEMA_DIR)/gschemas.compiled
	gnome-extensions pack \
		--extra-source=lib \
		--extra-source=prefs \
		--extra-source=assets \
		--extra-source=LICENSE \
		--extra-source=stylesheet.css \
		--schema=$(SCHEMA_DIR)/org.gnome.shell.extensions.spotlify.gschema.xml \
		--force
	@echo "Created package: $(UUID).shell-extension.zip"

clean:
	rm -f $(SCHEMA_DIR)/gschemas.compiled
	rm -f $(UUID).shell-extension.zip

log:
	journalctl -f -o cat /usr/bin/gnome-shell | grep -i spotlify
