package io.github.efeertureten.baristaclicker;

import android.graphics.Color;
import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import androidx.activity.SystemBarStyle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Kenardan kenara görünüm her Android sürümünde aynı olsun: sistem çubukları saydam, simgeleri koyu
        // (oyunun zemini açık renk). Güvenli alan boşlukları oyunda env(safe-area-inset-*) ile verilir.
        EdgeToEdge.enable(
            this,
            SystemBarStyle.light(Color.TRANSPARENT, Color.TRANSPARENT),
            SystemBarStyle.light(Color.argb(0xE6, 0xF1, 0xE6, 0xD6), Color.argb(0x80, 0x1B, 0x1B, 0x1B))
        );
        super.onCreate(savedInstanceState);
    }
}
