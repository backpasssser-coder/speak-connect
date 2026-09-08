import Foundation
import Capacitor
import AVFoundation

/**
 * 이름대기 / 따라말하기 / 자발화 답변 녹음용 네이티브 플러그인.
 * 이 프로젝트는 SPM 전용(CocoaPods 미사용) 구성이라 Podspec만 제공하는 커뮤니티 녹음 플러그인은
 * 그대로 붙일 수 없어, 서드파티 의존성 없이 AVFoundation만으로 최소 구현.
 */
@objc(AudioRecorderPlugin)
public class AudioRecorderPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AudioRecorderPlugin"
    public let jsName = "AudioRecorder"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startRecording", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopRecording", returnType: CAPPluginReturnPromise),
    ]

    private var recorder: AVAudioRecorder?
    private var outputURL: URL?

    @objc func requestPermission(_ call: CAPPluginCall) {
        AVAudioSession.sharedInstance().requestRecordPermission { granted in
            call.resolve(["granted": granted])
        }
    }

    @objc func startRecording(_ call: CAPPluginCall) {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .allowBluetooth])
            try session.setActive(true)

            let fileName = "\(UUID().uuidString).m4a"
            let url = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)
            outputURL = url

            let settings: [String: Any] = [
                AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
                AVSampleRateKey: 44100,
                AVNumberOfChannelsKey: 1,
                AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue,
            ]

            let newRecorder = try AVAudioRecorder(url: url, settings: settings)
            newRecorder.prepareToRecord()
            newRecorder.record()
            recorder = newRecorder
            call.resolve()
        } catch {
            call.reject("녹음 시작 실패: \(error.localizedDescription)")
        }
    }

    @objc func stopRecording(_ call: CAPPluginCall) {
        guard let activeRecorder = recorder, let url = outputURL else {
            call.reject("진행 중인 녹음이 없어요")
            return
        }
        activeRecorder.stop()
        recorder = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)

        do {
            let data = try Data(contentsOf: url)
            try? FileManager.default.removeItem(at: url)
            call.resolve([
                "base64": data.base64EncodedString(),
                "mimeType": "audio/m4a",
            ])
        } catch {
            call.reject("녹음 파일 읽기 실패: \(error.localizedDescription)")
        }
    }
}
