# Changelog

## [0.4.0](https://github.com/dokor/ai-delivery-engine/compare/ai-delivery-engine-v0.3.0...ai-delivery-engine-v0.4.0) (2026-07-04)


### Features

* **cli:** structure the ade CLI (init, doctor, config, review, fix, upgrade) ([#79](https://github.com/dokor/ai-delivery-engine/issues/79)) ([dd8f2dd](https://github.com/dokor/ai-delivery-engine/commit/dd8f2dd423d8756882a9fb18377dca4042b8dbee))
* **cli:** structure the ade CLI foundation (init, doctor, config, review, fix, upgrade) ([b59896d](https://github.com/dokor/ai-delivery-engine/commit/b59896d5ccae55abdbcbefa0d79cf1ee8283770a))
* **config:** add activatable rule packs field ([#100](https://github.com/dokor/ai-delivery-engine/issues/100)) ([d90dcea](https://github.com/dokor/ai-delivery-engine/commit/d90dcea4d617105cae3019bf747f4e23748705cb))
* **config:** add chill/normal/expert context modes ([#107](https://github.com/dokor/ai-delivery-engine/issues/107)) ([5e80ab7](https://github.com/dokor/ai-delivery-engine/commit/5e80ab7488f4ce49970454d308257236b6a756c0))
* **config:** add modular, inherited, validated ADE configuration ([#83](https://github.com/dokor/ai-delivery-engine/issues/83)) ([0a3f7b7](https://github.com/dokor/ai-delivery-engine/commit/0a3f7b7a10943522ce4e60c0217a1eee239d24de))
* **context:** build a targeted, budgeted context pack with a transparent manifest ([#106](https://github.com/dokor/ai-delivery-engine/issues/106)) ([85c296b](https://github.com/dokor/ai-delivery-engine/commit/85c296be86529c47de04f6c4f81515ac6f3ab7be))
* **context:** cache context packs by fingerprint with automatic invalidation ([#108](https://github.com/dokor/ai-delivery-engine/issues/108)) ([d617aac](https://github.com/dokor/ai-delivery-engine/commit/d617aac0633b4c0ed9a50feab703bdea2055348d))
* **context:** context-pack builder, chill/normal/expert modes, fingerprint cache + docs ([07fbefd](https://github.com/dokor/ai-delivery-engine/commit/07fbefde5ea824a66fa4055a6e78e1c29a761491))
* **context:** extract ranked neighbour fragments for diff-scoped review packs ([#102](https://github.com/dokor/ai-delivery-engine/issues/102)) ([4e476c1](https://github.com/dokor/ai-delivery-engine/commit/4e476c17f6b5355fd1902fd5480178079e4f1f64))
* **context:** generate a compact, deterministic project context ([#84](https://github.com/dokor/ai-delivery-engine/issues/84)) ([11e033e](https://github.com/dokor/ai-delivery-engine/commit/11e033e4102336215e369ca20ff5c7c389d2bb19))
* **context:** neighbour fragment extraction — completes the token-reduction epic ([#102](https://github.com/dokor/ai-delivery-engine/issues/102)) ([2d48493](https://github.com/dokor/ai-delivery-engine/commit/2d4849363c3f6f535ec188dc9b7bc5e1c6e914e1))
* **core:** config resolution, project context, and V1 critical-path tests ([9090555](https://github.com/dokor/ai-delivery-engine/commit/9090555129f754ab3698b57c7c10546908410754))
* **engine:** add CLI-independent review engine with normalized findings ([#79](https://github.com/dokor/ai-delivery-engine/issues/79)) ([945d4ed](https://github.com/dokor/ai-delivery-engine/commit/945d4ede64872630bc680593bcd054b92d910ee7))
* promote SEO Specialist from V2 to a V1 core role ([e8310f9](https://github.com/dokor/ai-delivery-engine/commit/e8310f970407972a27646d5234307f4e9bab36f0))
* promote SEO Specialist from V2 to a V1 core role ([8b03441](https://github.com/dokor/ai-delivery-engine/commit/8b03441a9dad56a4cf31bfe4aa12e183c9375c4b))
* **rules:** technical profiles and initial rule packs ([#100](https://github.com/dokor/ai-delivery-engine/issues/100)) ([b0a12c6](https://github.com/dokor/ai-delivery-engine/commit/b0a12c6850e4630115898863db4079cd968b87bc))
* **rules:** technical profiles and initial rule packs (Next/React/Angular/WordPress/Java + cross-cutting) ([79f4305](https://github.com/dokor/ai-delivery-engine/commit/79f430548007c90045d1edbe6bd6516e48d5fa59))

## [0.3.0](https://github.com/dokor/ai-delivery-engine/compare/ai-delivery-engine-v0.2.0...ai-delivery-engine-v0.3.0) (2026-07-02)


### Features

* compile TS→JS at publish so the CLI works from node_modules ([9968a49](https://github.com/dokor/ai-delivery-engine/commit/9968a49b764c22a651ae4cdb22d74c313985794b))


### Bug Fixes

* require TypeScript &gt;=5.7 for build and harden build script ([63888de](https://github.com/dokor/ai-delivery-engine/commit/63888dec8233847f33207bab5bae62f7cf1a8574))

## [0.2.0](https://github.com/dokor/ai-delivery-engine/compare/ai-delivery-engine-v0.1.0...ai-delivery-engine-v0.2.0) (2026-07-01)


### Features

* add backlog quality review ([00ca89d](https://github.com/dokor/ai-delivery-engine/commit/00ca89d73fecf8128be90d2b095134e9b3e58aea))
* add complete demo project fixture ([62148df](https://github.com/dokor/ai-delivery-engine/commit/62148df00f98fb56530e9789fcf8eab399ebf5f0))
* add demo workflow validation command ([f127516](https://github.com/dokor/ai-delivery-engine/commit/f127516f9294c77282c82e6a9f6953379739a999))
* add demo workflow validation command ([0a7d64e](https://github.com/dokor/ai-delivery-engine/commit/0a7d64e2a3270b75b0f8eb04bb424e18d427404c))
* add initial TypeScript agent contracts ([cefbe4d](https://github.com/dokor/ai-delivery-engine/commit/cefbe4de963a63bdd122cd4877be15b0aa924ca4))
* add local po pm backlog runner ([f4a8544](https://github.com/dokor/ai-delivery-engine/commit/f4a85448922e141c477ed9b6af147970f9c9702a))
* add local project status command ([8cf19ec](https://github.com/dokor/ai-delivery-engine/commit/8cf19eca3280da85006d4152d8ec8bae6fe38a78))
* add manual po pm prompt generation ([c00dc55](https://github.com/dokor/ai-delivery-engine/commit/c00dc552c9068d98ade202e61b65c486be37d72f))
* add provider-agnostic LLM layer ([d817075](https://github.com/dokor/ai-delivery-engine/commit/d817075691670be1da675b8528aa6d0e0e6c92aa))
* add specialist prompt generation ([c6162cf](https://github.com/dokor/ai-delivery-engine/commit/c6162cf6a5758099969f3aea1636bfe0ff154311))
* **agents:** add backend capability guidance ([f365839](https://github.com/dokor/ai-delivery-engine/commit/f36583978afc1dade7a6c658d891815ee97bab70))
* **agents:** link backend capability guidance ([5f196ea](https://github.com/dokor/ai-delivery-engine/commit/5f196eaf1baab3f7bafe22a2c71f2549d4aed3ab))
* **agents:** make frontend and backend roles capability-aware ([63d7ac3](https://github.com/dokor/ai-delivery-engine/commit/63d7ac322e5268e31b79346207d4103e16115061))
* **agents:** make frontend role capability-aware ([25fa529](https://github.com/dokor/ai-delivery-engine/commit/25fa529aee0ef6e5b13fc852656fffb220ef576e))
* define po pm ai output contract ([5b9cf8a](https://github.com/dokor/ai-delivery-engine/commit/5b9cf8ae3a02c4621c9abec083742b4a2f37fc59))
* export backlog items to markdown ([92307e8](https://github.com/dokor/ai-delivery-engine/commit/92307e80bfcaa16af7d46ab8bbe086776d861e29))
* generate backlog export manifest ([2333084](https://github.com/dokor/ai-delivery-engine/commit/23330846b6539362a9e0a4cd71c8c1fd87e84cd0))
* import manual po pm responses ([ae4b630](https://github.com/dokor/ai-delivery-engine/commit/ae4b63012aa3511b881c0a10f2b50f5624376f50))
