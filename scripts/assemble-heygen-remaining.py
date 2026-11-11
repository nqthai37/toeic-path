"""Assemble retained PCM with exact HeyGen timings; no synthesis/network."""
import argparse
from array import array
import hashlib
import json
import math
from pathlib import Path
import sys
import wave

parser = argparse.ArgumentParser()
parser.add_argument('--input', type=Path, required=True)
source = parser.parse_args().input.resolve()
root = Path(__file__).resolve().parent.parent
plan = json.loads((source / 'plan.json').read_text(encoding='utf-8'))
output = root / 'src/assets/audio/heygen-extra'
output.mkdir(parents=True, exist_ok=True)
rate, width = 24000, 2
tracks, metadata = {}, {}
for batch in plan['batches']:
    name = batch['id']
    data = (source / f'{name}-original.pcm').read_bytes()
    info = json.loads((source / f'{name}-result.json').read_text(encoding='utf-8'))
    assert info['timingText'] == batch['text']
    assert len(info['startFrames']) == len(info['endFrames']) == len(batch['text'])
    assert len(data) % width == 0
    assert abs(len(data) / width / rate - info['duration']) < .01
    assert info['voice'] == batch['voice']
    tracks[name] = (data, info)
    metadata[name] = {
        'voice': info['voice'], 'language': 'en', 'requestedModel': 'server-default',
        'returnedModel': None, 'submittedText': batch['text'],
        'duration': len(data) / width / rate, 'originalFile': f'{name}-original.pcm',
        'sha256': hashlib.sha256(data).hexdigest(),
        'format': {'encoding': 'pcm_s16le', 'sampleRate': rate, 'channels': 1},
        'timing': 'HeyGen original_characters rounded to nearest 24000 Hz sample',
    }
recordings, provenance = [], []
for record in plan['recordings']:
    chunks, turns, cursor = [], [], 0
    for index, turn in enumerate(record['turns']):
        data, info = tracks[turn['batch']]
        text, starts, ends = info['timingText'], info['startFrames'], info['endFrames']
        first, last = turn['start'], turn['end'] - 1
        assert text[first:last + 1] == turn['text']
        previous, following = first - 1, last + 1
        while previous >= 0 and text[previous].isspace():
            previous -= 1
        while following < len(text) and text[following].isspace():
            following += 1
        start = max(0, starts[first] - round(.06 * rate), ends[previous] if previous >= 0 else 0)
        end = min(len(data) // width, ends[last] + round(.08 * rate),
                  starts[following] if following < len(text) else len(data) // width)
        assert 0 <= start < end <= len(data) // width
        clip = data[start * width:end * width]
        samples = array('h', clip)
        if sys.byteorder != 'little':
            samples.byteswap()
        assert samples and math.sqrt(sum(s * s for s in samples) / len(samples)) > 10, 'Silent turn'
        if index:
            silence = bytes(round(.18 * rate) * width)
            chunks.append(silence)
            cursor += len(silence) // width
        turns.append({'role': turn['role'], 'text': turn['text'],
                      'start': cursor / rate, 'end': (cursor + len(clip) // width) / rate,
                      'batch': turn['batch'], 'sourceStartFrame': start, 'sourceEndFrame': end,
                      'sourceCharacterStart': first, 'sourceCharacterEnd': last + 1})
        chunks.append(clip)
        cursor += len(clip) // width
    script_hash = hashlib.sha256(record['text'].encode()).hexdigest()
    filename = f'{record["kind"]}-{script_hash[:16]}.wav'
    with wave.open(str(output / filename), 'wb') as wav:
        wav.setparams((1, width, rate, 0, 'NONE', 'not compressed'))
        wav.writeframes(b''.join(chunks))
    with wave.open(str(output / filename), 'rb') as wav:
        assert wav.getnframes() == cursor and wav.getframerate() == rate
        assert wav.getnchannels() == 1 and wav.getsampwidth() == width
    published = {key: record[key] for key in ('id', 'text', 'kind', 'questionIds')}
    published.update(src=f'assets/audio/heygen-extra/{filename}', duration=cursor / rate,
                     turns=[{k: t[k] for k in ('role', 'start', 'end')} for t in turns])
    recordings.append(published)
    provenance.append({**published, 'scriptSha256': script_hash, 'sourceTurns': turns,
                       'sha256': hashlib.sha256((output / filename).read_bytes()).hexdigest()})
assert len(recordings) == 89
manifest = {'version': 1, 'provider': 'HeyGen', 'voices': plan['voices'], 'recordings': recordings}
(root / 'src/data/heygen-extra.js').write_text(
    '// Approved scripts; derived from exact HeyGen character timings.\nconst HEYGEN_EXTRA_AUDIO = '
    + json.dumps(manifest, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
(root / 'docs/heygen-all-voices-provenance.json').write_text(json.dumps({
    'scope': plan['scope'], 'existingPart3Provenance': 'heygen-part3-provenance.json',
    'tracks': metadata, 'recordings': provenance,
    'processing': {'speed': 1, 'pitch': 1, 'betweenTurnsSeconds': .18,
                   'method': 'Exact character timing, rounded to nearest source sample; bounded padding'},
    'review': {'exactSubmittedTextVerified': True, 'wavFormatAndDurationVerified': True,
               'silentTurnsRejected': True, 'fullHumanListeningReview': False},
}, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'PASS: {len(recordings)} new recordings; {sum(r["duration"] for r in recordings):.2f}s.')
