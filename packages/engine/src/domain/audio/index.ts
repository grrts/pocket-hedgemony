/**
 * Audio (domain/audio/spec.md): the music director, the effects director and
 * the PH-5 chip's rules as pure functions. Balance numbers live in
 * rules/data/domain/audio.json (music.yaml and sfx.yaml of the designs). No
 * Web Audio here, and nothing in this context feeds back into the engine.
 */
export * from "./music.ts";
export * from "./effects.ts";
export * from "./platform.ts";
