# English–Korean tokenizer assets

Source model: Helsinki-NLP/opus-mt-tc-big-en-ko, revision ae8606b7b29a495f31ce679cee2007f536a3a5ce.
https://huggingface.co/Helsinki-NLP/opus-mt-tc-big-en-ko
Model-card license: CC-BY-4.0, https://creativecommons.org/licenses/by/4.0/

The local English encoder tokenizer is derived from the original source.spm with its original piece order and scores, a simple NFKC normalizer, Metaspace processing and an appended EOS token. The Korean decoder vocabulary is derived from the target vocabulary represented by the tokenizer JSON at R4kSo1997/opus-mt-en-ko-onnx-int8, revision 86868c78b24a24a88b83b6436cd20187eba76e10. That repository identifies the same Helsinki base model. Its tokenizer config supplies the special token definitions.

Changes: separate English encoder IDs from Korean decoder IDs; restore original source segmentation scores and explicit EOS. The upstream fast JSON's shared map is not used for English encoding. ASCII interview fixtures are tested against SentencePiece reference IDs. This is an approximate Transformers.js tokenizer conversion, not a claim of byte-for-byte normalization equivalence for all Unicode.

The ONNX weights are fetched separately from noticemkjung/opus-mt-tc-big-en-ko-ONNX, revision aea67600956847d47609f96b364f33a734007d50 (CC-BY-4.0 base model).
