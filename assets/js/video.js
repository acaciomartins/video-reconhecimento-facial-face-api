const video = document.getElementById('video')

const startVideo = () => {
    // video.playbackRate = 0.5;
    // video.src = './assets/video/video.mp4';
}
console.log(video)
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('./assets/lib/face-api/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('./assets/lib/face-api/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('./assets/lib/face-api/models'),
    faceapi.nets.faceExpressionNet.loadFromUri('./assets/lib/face-api/models'),
    faceapi.nets.ageGenderNet.loadFromUri('./assets/lib/face-api/models'),
    faceapi.nets.ssdMobilenetv1.loadFromUri('./assets/lib/face-api/models'),
]).then(startVideo)

const loadLabels = () => {
    const labels = ['Acacio Martins', 'MariaEduarda']
    return Promise.all(labels.map(async label => {
        const descriptions = [];
        for (let i = 1; i < 3; i++) {
            const img = await faceapi.fetchImage(`./assets/lib/face-api/labels/${label}/${i}.jpg`);
            const detections = await faceapi
                .detectSingleFace(img)
                .withFaceLandmarks()
                .withFaceDescriptor()

            descriptions.push(detections.descriptor);
        }
        return new faceapi.LabeledFaceDescriptors(label, descriptions)
    }))
}

video.addEventListener('play', async () => {
    console.log('play now');
    const canvas = faceapi.createCanvasFromMedia(video);
    const canvasSize = {
        width: video.width,
        height: video.height
    }
    const labels = await loadLabels()
    faceapi.matchDimensions(canvas, canvasSize)
    document.body.appendChild(canvas);

    setInterval(async () => {
        //deteccoes
        const detections = await faceapi
            .detectAllFaces(
                video,
                new faceapi.TinyFaceDetectorOptions()
            )
            .withFaceLandmarks()
            .withFaceExpressions()
            .withAgeAndGender()
            .withFaceDescriptors()

        const resizeDetections = faceapi.resizeResults(detections, canvasSize);

        const faceMatcher = new faceapi.FaceMatcher(labels, 0.6);
        const results = resizeDetections.map(d =>
            faceMatcher.findBestMatch(d.descriptor)
        )

        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, resizeDetections);
        // faceapi.draw.drawFaceLandmarks(canvas, resizeDetections);
        // faceapi.draw.drawFaceExpressions(canvas, resizeDetections);

        //idade, sexo
        // resizeDetections.forEach(detection => {
        //     const { age, gender, genderProbability } = detection;
        //     new faceapi.draw.DrawTextField([
        //         `${parseInt(age, 10)} years`,
        //         `${gender} (${parseInt(genderProbability * 100, 10)})`
        //     ], detection.detection.box.topRight).draw(canvas)
        // })

        results.forEach((result, index) => {
            const box = resizeDetections[index].detection.box
            const { label, distance } = result
            new faceapi.draw.DrawTextField([
                `${label} (${distance})`
            ], box.bottomRight).draw(canvas)
        })
    }, 100)
})