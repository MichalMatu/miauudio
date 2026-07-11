package io.github.michalmatu.miauudio;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import io.github.michalmatu.miauudio.audio.MiauudioAudioPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MiauudioAudioPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
