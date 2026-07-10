package io.github.michalmatu.soundscape;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import io.github.michalmatu.soundscape.audio.MiauudioAudioPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MiauudioAudioPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
