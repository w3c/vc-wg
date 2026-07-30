
This is a draft list of where the new terms could end up in the vocabularies and context files. The new vocabulary/context names are obviously to be agreed upon. See also [v2](https://github.com/w3c/vc-wg/blob/main/vocabs/v2.md) for the current situation.


- **Render method:**
	- Vocabulary: add it to VCDM: https://www.w3.org/2018/credentials#
	- Context: add it to https://www.w3.org/ns/credentials/v2.1
	- Note: there is already a `RenderMethod` class in the VCDM Vocabulary (as a "reserved" class)
- **Confidence method:**
	- Vocabulary: add it to VCDM: https://www.w3.org/2018/credentials#
	- Context: add it to https://www.w3.org/ns/credentials/v2.1
	- Note: there is already a `ConfidenceMethod` class in the VCDM Vocabulary (as a "reserved" class)
- **Bitstring status list additions:**
	- Vocabulary: add it to SL: https://www.w3.org/ns/credentials/status#
	- Context: create a new context file https://www.w3.org/ns/credentials/status/v1.1 but also add the terms to https://w3id.org/security/data-integrity/v2.1
- **Forgery defense:**
	- Vocabulary: create a new vocabulary, e.g., https://www.w3.org/ns/credentials/forgeryDefense#
	- Context: create a new context file, e.g., https://www.w3.org/ns/credentials/forgeryDefense/v1 but also add the terms to https://w3id.org/security/data-integrity/v2.1
	- Note: my argument is based on a matter of consistency with the status list.
- **Recognized entities:**
	- Vocabulary: create a new vocabulary, e.g., https://www.w3.org/ns/credentials/recognizedEntities#
	- Context: create a new context file, e.g., https://www.w3.org/ns/credentials/recognizedEntities/v1
	- Note: see https://github.com/w3c/vc-recognized-entities/issues/73#issuecomment-4661577618 for my arguments.
- **Barcodes:**
	- Vocabulary: create a new vocabulary, e.g., https://www.w3.org/ns/credentials/barcodes#
	- Context: create a new context file, e.g., https://www.w3.org/ns/credentials/barcodes/v1
	- Note: see https://github.com/w3c/vc-recognized-entities/issues/73#issuecomment-4661577618 for my arguments which, I believe, also apply here.
