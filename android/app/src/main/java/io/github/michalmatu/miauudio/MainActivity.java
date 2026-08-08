package io.github.michalmatu.miauudio;

import android.os.Bundle;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;
import io.github.michalmatu.miauudio.audio.MiauudioAudioPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MiauudioAudioPlugin.class);
        super.onCreate(savedInstanceState);
        applyImmersiveSystemBars();
    }

    @Override
    public void onResume() {
        super.onResume();
        applyImmersiveSystemBars();
    }

    private void applyImmersiveSystemBars() {
        WindowInsetsControllerCompat insetsController =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());

        if (insetsController == null) {
            return;
        }

        insetsController.hide(WindowInsetsCompat.Type.statusBars());
        insetsController.show(WindowInsetsCompat.Type.navigationBars());
        insetsController.setSystemBarsBehavior(
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        );
    }
}
