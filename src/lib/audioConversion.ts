import * as FFmpeg from '@ffmpeg/ffmpeg';

// Conversão real de áudio WebM para OGG/Opus para compatibilidade com WhatsApp
const anyFFmpeg = (FFmpeg as any).default || (FFmpeg as any);
const { createFFmpeg, fetchFile } = anyFFmpeg;

const ffmpeg = createFFmpeg({
  log: false,
});

export async function convertToOggOpus(input: Blob): Promise<Blob> {
  // Se já vier em OGG, apenas retorna
  if (input.type.includes('ogg')) {
    return input;
  }

  if (!ffmpeg.isLoaded()) {
    await ffmpeg.load();
  }

  const inputName = 'input.webm';
  const outputName = 'output.ogg';

  ffmpeg.FS('writeFile', inputName, await fetchFile(input));

  // Converte para OGG com codec Opus em bitrate baixo para reduzir tamanho
  await ffmpeg.run(
    '-i', inputName,
    '-vn',
    '-acodec', 'libopus',
    '-b:a', '32k',
    outputName,
  );

  const data = ffmpeg.FS('readFile', outputName);

  // Limpa arquivos temporários
  try {
    ffmpeg.FS('unlink', inputName);
    ffmpeg.FS('unlink', outputName);
  } catch {
    // ignore
  }

  return new Blob([data.buffer], { type: 'audio/ogg' });
}
