export default {
    fromDiv: function (ref, userId, displayName, tab) {
        this.timeouts = {};
        this.ref_ = ref;
        this.userId_ = parseInt(userId);
        this.firebaseCallbacks_ = [];
        this.displayName_ = displayName;
        this.tab = tab;
        this.editor = tab.editor;
        
        var self = this;
        this.firebaseOn_(ref.root.child('.info/connected'), 'value', function (s) {
            if (s.val() === true && self.displayName_) {
                var nameRef = ref.child(self.userId_).child('name');
                nameRef.onDisconnect().remove();
                nameRef.set(self.displayName_);
            }
        });
		this.makeUserEntriesForOthers_();

        return this;
    },

    dispose: function () {
        this.removeFirebaseCallbacks_();
    },

    getOffset: function (element) {
        var top = 0;
        var left = 0;
        while (element) {
            top += element.offsetTop;
            left += element.offsetLeft;
            element = element.offsetParent;
        }
        return {
            top: top,
            left: left
        };
    },

    removeFadeOut: function (el, duration) {
        var seconds = duration/1000;
        el.style.transition = "opacity "+seconds+"s ease";
    
        el.style.opacity = 0;
        setTimeout(function() {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        }, duration);
    },

    makeUserEntriesForOthers_: function () {
        var self = this;

        function updateChild(userSnapshot) {
            var userId = JSON.parse(userSnapshot.key);

            console.log('user: ' + userId);

            var name = userSnapshot.child('name').val();

            if (typeof name !== 'string') {
                return;
            }
            name = name.substring(0, 20);
            var color = userSnapshot.child('color').val();
            if (typeof color !== 'string') {
                //color = "#ffb"
                console.log('remove ' + userId);

                const index = self.tab.users.findIndex(element => element.id === userId);
                if (index !== -1) {
                    self.tab.users.splice(index, 1);
                }

                //remove label
                var label = document.getElementById('label_' + userId);
                if (label) {
                    label.parentNode.removeChild(label);
                }

                return;
            }

            // fix color
            if (typeof color !== 'string' || !color.match(/^#[a-fA-F0-9]{3,6}$/)) {
                color = "#ffb"
            }

            const exists = self.tab.users.some(element => element.id === userId);
            if (!exists) {
                self.tab.users.push({
                    id: userId,
                    color: color,
                    name: name
                });
                console.log('push user');
            }

            // update tab
            self.tab.updateKey++;

            //cursor label
            var cursor = userSnapshot.child('cursor').val();
            if (cursor !== null && userId !== self.userId_) {
				var end = cursor.selectionEnd;
				var pos = self.editor.getSession().getDocument().indexToPosition(end);

				pos = self.editor.renderer.textToScreenCoordinates(pos.row, pos.column);
				var offset = self.getOffset(self.editor.container);

				pos.pageX -= offset.left;
				pos.pageY -= offset.top;

                var el;
				if (document.getElementById('label_' + userId)) {
					el = document.getElementById('label_' + userId);
				} else {
					el = document.createElement('span');
					el.id = 'label_'+userId;
					el.innerHTML = name;
					el.className = 'other_cursor';
				}

				el.style.top = pos.pageY - 14 + "px";
				el.style.left = pos.pageX + "px";
				el.style.backgroundColor = color;

				self.editor.container.appendChild(el);
				//fade after a few seconds
				clearTimeout(self.timeouts[userId]);
				self.timeouts[userId] = setTimeout(
					function(){
                        self.removeFadeOut(el, 500);
					}, 2000);
            }
        }
        this.firebaseOn_(this.ref_, 'child_added', updateChild);
        this.firebaseOn_(this.ref_, 'child_changed', updateChild);
        this.firebaseOn_(this.ref_, 'child_moved', updateChild);
        this.firebaseOn_(this.ref_, 'child_removed', function (removedSnapshot) {
            var userId = JSON.parse(removedSnapshot.key);
            console.log('remove ' + userId);

            const index = self.tab.users.findIndex(element => element.id === userId);
            if (index !== -1) {
                self.tab.users.splice(index, 1);
            }
        });
    },

    firebaseOn_: function (ref, eventType, callback, context) {
        this.firebaseCallbacks_.push({
            ref: ref,
            eventType: eventType,
            callback: callback,
            context: context
        });
        ref.on(eventType, callback, context);
        return callback;
    },

    firebaseOff_: function (ref, eventType, callback, context) {
        ref.off(eventType, callback, context);
        for (var i = 0; i < this.firebaseCallbacks_.length; i++) {
            var l = this.firebaseCallbacks_[i];
            if (l.ref === ref && l.eventType === eventType && l.callback === callback && l.context === context) {
                this.firebaseCallbacks_.splice(i, 1);
                break;
            }
        }
    },

    removeFirebaseCallbacks_: function () {
        for (var i = 0; i < this.firebaseCallbacks_.length; i++) {
            var l = this.firebaseCallbacks_[i];
            l.ref.off(l.eventType, l.callback, l.context);
        }
        this.firebaseCallbacks_ = [];
    }
}