import Capacitor

/**
 * 앱 전용(로컬) 네이티브 플러그인은 npm 패키지가 아니라서 `cap sync`가 자동으로 등록해주지 않음.
 * capacitorDidLoad()에서 직접 등록해줘야 JS 쪽 registerPlugin("AudioRecorder") 호출이 네이티브 구현을 찾음.
 */
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(AudioRecorderPlugin())
    }
}
