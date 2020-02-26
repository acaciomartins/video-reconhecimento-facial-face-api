// navigator.getUserMedia({ video: true })
const cam = document.getElementById('cam')

const startVideo = () => {
    navigator.mediaDevices.enumerateDevices()
        .then(devices => {
            if (Array.isArray(devices)) {
                // console.log(devices);
                //tem dispositivos
                // devices.forEach(device => {
                //     if (device.kind === 'videoinput') {
                //         // é uma camera
                //         console.log(device)
                //         navigator.getUserMedia(
                //             {
                //                 video: {
                //                     deviceId: device.deviceId
                //                 }
                //             },
                //             stream => cam.srcObject = stream,
                //             error => console.log(error)
                //         );
                //     }
                // })

            }
        })
}

//tinyFaceDetector - detectar rostos do video
//faceLandmark68Net - desenha os tracos
//faceRecognitionNet reconhecimento
//faceExpressionNet detecta expressoes
//ageGenderNet idade e genero
// ssdMobilenetv1 pra desenhar

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
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('./assets/lib/face-api/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('./assets/lib/face-api/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('./assets/lib/face-api/models'),
    faceapi.nets.faceExpressionNet.loadFromUri('./assets/lib/face-api/models'),
    faceapi.nets.ageGenderNet.loadFromUri('./assets/lib/face-api/models'),
    faceapi.nets.ssdMobilenetv1.loadFromUri('./assets/lib/face-api/models'),
]).then(startVideo)


cam.addEventListener('play', async () => {
    const canvas = faceapi.createCanvasFromMedia(cam);
    const canvasSize = {
        width: cam.width,
        height: cam.height
    }
    const labels = await loadLabels()
    faceapi.matchDimensions(canvas, canvasSize)
    document.body.appendChild(canvas);
    setInterval(async () => {
        //deteccoes
        const detections = await faceapi
            .detectAllFaces(
                cam,
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
        faceapi.draw.drawFaceLandmarks(canvas, resizeDetections);
        faceapi.draw.drawFaceExpressions(canvas, resizeDetections);

        //idade, sexo
        resizeDetections.forEach(detection => {
            const { age, gender, genderProbability } = detection;
            new faceapi.draw.DrawTextField([
                `${parseInt(age, 10)} years`,
                `${gender} (${parseInt(genderProbability * 100, 10)})`
            ], detection.detection.box.topRight).draw(canvas)
        })

        results.forEach((result, index) => {
            const box = resizeDetections[index].detection.box
            const { label, distance } = result
            new faceapi.draw.DrawTextField([
                `${label} (${distance})`
            ], box.bottomRight).draw(canvas)
        })
    }, 100)
})

