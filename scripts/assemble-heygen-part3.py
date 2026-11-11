"""Assemble already-generated HeyGen tracks using their exact character timings.

This script never calls a speech service. Original PCM and timing files remain
unchanged in the supplied input directory; published WAV files are derived assets.
"""
import argparse
from array import array
import hashlib
import json
import math
from pathlib import Path
import wave
import sys

parser = argparse.ArgumentParser()
parser.add_argument('--input', type=Path, required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
source = args.input.resolve()
plan = json.loads((source / 'plan.json').read_text(encoding='utf-8'))
output = root / 'src/assets/audio/heygen-part3'
output.mkdir(parents=True, exist_ok=True)
rate, width, channels = 24000, 2, 1
tracks, metadata = {}, {}

for role in ('female', 'male'):
    data = (source / f'{role}-original.pcm').read_bytes()
    info = json.loads((source / f'{role}-result.json').read_text(encoding='utf-8'))
    timing = info['original_characters']
    assert ''.join(item[0] for item in timing) == plan['batch'][role]['text']
    assert len(data) % width == 0
    duration = len(data) / rate / width
    assert abs(duration - info['duration']) < .01
    tracks[role] = (data, timing)
    metadata[role] = {
        'voice': info['voice'], 'language': 'en', 'requestedModel': 'server-default',
        'returnedModel': None, 'duration': duration,
        'originalFile': f'{role}-original.pcm',
        'sha256': hashlib.sha256(data).hexdigest(),
        'format': {'encoding': 'pcm_s16le', 'sampleRate': rate, 'channels': channels},
        'timing': 'HeyGen original_characters, exact submitted text verified',
    }

recordings, provenance = [], []
for conversation in plan['scripts']:
    chunks, turns, cursor = [], [], 0
    for index, turn in enumerate(conversation['turns']):
        data, timing = tracks[turn['role']]
        first, last = turn['start'], turn['end'] - 1
        assert ''.join(item[0] for item in timing[first:last + 1]) == turn['text']
        previous = first - 1
        while previous >= 0 and timing[previous][0].isspace():
            previous -= 1
        following = last + 1
        while following < len(timing) and timing[following][0].isspace():
            following += 1
        start = max(0, timing[first][1] - .06,
                    timing[previous][2] if previous >= 0 else 0)
        end = min(len(data) / rate / width, timing[last][2] + .08,
                  timing[following][1] if following < len(timing) else float('inf'))
        assert end > start
        start_frame, end_frame = int(start * rate), int(end * rate)
        clip = data[start_frame * width:end_frame * width]
        samples = array('h', clip)
        if sys.byteorder != 'little':
            samples.byteswap()
        assert samples and math.sqrt(sum(sample * sample for sample in samples) / len(samples)) > 10, 'Silent dialogue turn'
        if index:
            silence = bytes(round(.18 * rate) * width)
            chunks.append(silence)
            cursor += len(silence) // width
        turns.append({
            'role': turn['role'], 'text': turn['text'],
            'start': cursor / rate, 'end': (cursor + len(clip) // width) / rate,
            'sourceStart': start_frame / rate, 'sourceEnd': end_frame / rate,
            'sourceCharacterStart': first, 'sourceCharacterEnd': last + 1,
        })
        chunks.append(clip)
        cursor += len(clip) // width
    filename = f'conversation-{conversation["id"]:02d}.wav'
    with wave.open(str(output / filename), 'wb') as wav:
        wav.setparams((channels, width, rate, 0, 'NONE', 'not compressed'))
        wav.writeframes(b''.join(chunks))
    with wave.open(str(output / filename), 'rb') as wav:
        duration = wav.getnframes() / wav.getframerate()
        assert wav.getnchannels() == 1 and wav.getsampwidth() == 2
        assert wav.getnframes() == cursor
    record = {
        'id': conversation['id'], 'text': conversation['text'],
        'questionIds': conversation['questionIds'],
        'src': f'assets/audio/heygen-part3/{filename}', 'duration': duration,
        'turns': [{'role': turn['role'], 'start': turn['start'], 'end': turn['end']} for turn in turns],
    }
    recordings.append(record)
    provenance.append({**record, 'sourceTurns': turns,
                       'sha256': hashlib.sha256((output / filename).read_bytes()).hexdigest()})
    print(f'{filename}: {duration:.3f}s, {len(turns)} turns')

assert len(recordings) == 13
manifest = {'version': 1, 'provider': 'HeyGen', 'voices': plan['voices'], 'recordings': recordings}
(root / 'src/data/heygen-part3.js').write_text(
    '// Generated from approved original scripts and verified HeyGen character timings.\n'
    + 'const HEYGEN_PART3_AUDIO = ' + json.dumps(manifest, ensure_ascii=False, indent=2) + ';\n',
    encoding='utf-8')
(root / 'docs/heygen-part3-provenance.json').write_text(json.dumps({
    'scope': '13 original Part 3 conversations', 'tracks': metadata, 'recordings': provenance,
    'processing': {'speed': 1, 'pitch': 1, 'betweenTurnsSeconds': .18,
                   'method': 'Sample-accurate cuts from returned character timing; no guessed timestamps'},
    'review': {'exactSubmittedTextVerified': True, 'wavFormatAndDurationVerified': True,
               'silentTurnsRejected': True, 'fullHumanListeningReview': False},
}, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'PASS: {len(recordings)} conversations, {sum(len(r["turns"]) for r in recordings)} timed turns, '
      f'{sum(r["duration"] for r in recordings):.2f}s total audio.')
