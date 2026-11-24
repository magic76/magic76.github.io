# Learning speech licensing and release record

Reviewed: 2026-11-24. Public notice: /licenses/ (Settings → About Koolo).

## Selected models
- Paradee v1.3, eeh-1, Kitten TTS 2 Mini and Pico: model repositories declare Apache-2.0. Retain upstream license and attribution; verify model-specific notices and dataset conditions when distributing.
- Huayan Medium: [repository MIT metadata](https://huggingface.co/rhasspy/piper-voices), but [voice model card](https://huggingface.co/rhasspy/piper-voices/blob/main/zh/zh_CN/huayan/medium/MODEL_CARD) lists the dataset license as Unknown. The original PlayVoice/HuaYan_TTS repository was not accessible when checked. This is unresolved, not a finding of infringement or a permission grant. [Previous inquiry](https://huggingface.co/csukuangfj/vits-piper-zh_CN-huayan-medium/discussions/1) was directed to the Piper Voices maintainers. [Dataset reference discussion](https://github.com/rhasspy/piper/issues/818).

## Full phonemizer
Browser fetches the upstream unmodified JS/WASM/data directly from [pinned distribution](https://huggingface.co/spaces/csukuangfj/piper-phonemize/tree/29c4a1977913f70e282d8328e87f54100672bf17), which declares GPL-3.0-or-later. [License](https://www.gnu.org/licenses/gpl-3.0.html), [piper-phonemize source and build](https://github.com/csukuangfj/piper-phonemize), [eSpeak NG source](https://github.com/espeak-ng/espeak-ng). Public notice is not by itself proof of GPL compliance. Before redistributing any binary, verify the precise corresponding source (including dependency revisions and build scripts), preserve license/copyright notices and provide the source as required. The exact matching GitHub source revision for the pinned upstream WASM is not yet confirmed. Review whether the integrating code is subject to additional GPL requirements; do not assume worker separation automatically exempts it.

## Outstanding commercial-use inquiry
Status: not sent; original repository unavailable and Hugging Face authenticated posting is not available in the current integration. Proposed recipient: https://huggingface.co/rhasspy/piper-voices/discussions

Subject: Commercial-use clarification for zh_CN-huayan-medium

Hello, I maintain Koolo (https://koolo.app), a language-learning web application. We are evaluating the unmodified zh_CN-huayan-medium ONNX voice for on-device Mandarin pronunciation. The model repository declares MIT, but its MODEL_CARD lists the training dataset license as Unknown and the original PlayVoice/HuaYan_TTS link is unavailable.

Could you clarify whether the voice weights and generated audio may be used for free and paid commercial language-learning features, whether direct browser downloads and caching of the weights are permitted, and whether attribution or speaker/recording permissions are required? If you are not the rights holder, could you point us to the original rights holder or another Mandarin model with clear rights? Thank you.

## Release checklist
- [ ] Record an explicit rights-holder response or replace Huayan with a verified alternative before commercial rollout.
- [ ] Verify corresponding source and any distribution obligations for the exact eSpeak WASM.
- [ ] Audit dependency notices beyond the direct components listed on /licenses/.
- [ ] Preserve ability to change Mandarin model or fall back to device TTS without changing learning data.
