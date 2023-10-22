
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['midifile', 'midievents'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        
		var MIDIFile = require('midifile');
		var MIDIEvents = require('midievents');

        module.exports = factory(MIDIFile, MIDIEvents);
    } else {
        // Browser globals (root is window)
        root.midiflip = factory(root.MIDIFile, root.MIDIEvents);
    }
}(this, function (MIDIFile, MIDIEvents) {
	return function(arrayBuffer, fn, mess_with_percussion, fix_range){
		
		var midiFile = new MIDIFile(arrayBuffer);
		
		for(var track_index = 0; track_index < midiFile.tracks.length; track_index++){
			var events = midiFile.getTrackEvents(track_index);
			var old_min_value = 127;
			var old_max_value = 0;
			var new_min_value = 127;
			var new_max_value = 0;

			for(var i=0; i<events.length; i++){
				var event = events[i];
				if(event.type === MIDIEvents.EVENT_MIDI){
					if(event.subtype === MIDIEvents.EVENT_MIDI_NOTE_OFF || event.subtype === MIDIEvents.EVENT_MIDI_NOTE_ON){
						var isPercussion = event.channel === 9 || event.channel === 10; // Channel 10 or 11
						// NOTE: I don't think channel 11 (coded 10) is guaranteed to be percussion.
						if(!isPercussion || mess_with_percussion){
							// TODO: account for randomness in fn by transforming NOTEOFFs the same as the previous NOTEON
							// can keep a map of midi note numbers to what the previous NOTEON was transformed to
							if (fix_range) {
								if (event.param1 < old_min_value) {
									old_min_value = event.param1;
								}
								if (event.param1 < old_max_value) {
									old_max_value = event.param1;
								}
							}
							new_value = fn(event.param1, {channel: event.channel, isPercussion: isPercussion});
							event.param1 = new_value
							if (fix_range) {
								if (event.param1 < new_min_value) {
									new_min_value = event.param1;
								}
								if (event.param1 < new_max_value) {
									new_max_value = event.param1;
								}
							}
						}
					}
				}
			}
			if (fix_range && (old_min_value != new_min_value || old_max_value != new_max_value)) {
				// There may be a better way then Math.round(stuff/12)*12, but I don't want to check.
				var note_change = Math.round((new_min_value - old_min_value)/12)*12;
				for(var i=0; i<events.length; i++){
					var event = events[i];
					if(event.type === MIDIEvents.EVENT_MIDI){
						if(event.subtype === MIDIEvents.EVENT_MIDI_NOTE_OFF || event.subtype === MIDIEvents.EVENT_MIDI_NOTE_ON){
							var isPercussion = event.channel === 9 || event.channel === 10; // Channel 10 or 11
							// NOTE: I don't think channel 11 (coded 10) is guaranteed to be percussion.
							if(!isPercussion || mess_with_percussion){
								// TODO: account for randomness in fn by transforming NOTEOFFs the same as the previous NOTEON
								// can keep a map of midi note numbers to what the previous NOTEON was transformed to
								new_value = event.param1 + note_change;
								event.param1 = new_value
							}
						}
					}
				}
			}
			midiFile.setTrackEvents(track_index, events);
		}
		
		return midiFile.getContent();
	};
}));
