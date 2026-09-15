"""Loop Joseph Sardin's CC0 real horse gallop in tall grass, at original pitch."""
from pathlib import Path
import subprocess
root=Path(__file__).resolve().parents[1]
# Trim approach/departure, crossfade the tail into the head for a continuous recording bed.
subprocess.run(['ffmpeg','-y','-v','error','-ss','3','-t','30','-i',str(root/'assets/source/audio/horse-grass-1850.mp3'),'-filter_complex',
 '[0:a]highpass=f=65,asplit=3[a][b][c];[a]atrim=start=1:end=29,asetpts=PTS-STARTPTS[mid];[b]atrim=start=29:end=30,asetpts=PTS-STARTPTS[tail];[c]atrim=start=0:end=1,asetpts=PTS-STARTPTS[head];[tail][head]acrossfade=d=1:c1=tri:c2=tri[seam];[mid][seam]concat=n=2:v=0:a=1[out]',
 '-map','[out]','-ar','44100','-ac','2','-c:a','libmp3lame','-b:a','192k',str(root/'public/assets/audio/horse-grass.mp3')],check=True)
