const fs = require('fs');

class gw2v {
    //init variables
    constructor(filePath, logging = false, walkLength = 10, walks = 100, dimensionSize = 300, learningRate = 0.01) {
        //init constructor args
        this.graph = new Map();
        this.nodeFrequencies = new Map();
        this.logging = logging;
        this.walkLength = walkLength;
        this.walks = walks;
        this.dimensionSize = dimensionSize;
        this.learningRate = learningRate;
        //build graphs
        this.buildGraph(filePath);
        //init weight matricies and word mappings
        this.wordToId = new Map();
        this.inputWeights = [];
        this.outputWeights = [];
    }

    //generate co-occurence graph from a .txt corpus w/adjacency lists
    buildGraph(filePath) {
        const fileContent = fs.readFileSync(filePath, "utf8");
        const words = fileContent.replace(/\r/g, "").split("\n").map(line => line.split(" "));
        for(const sentence of words) {
            for(let i = 0; i < sentence.length; i++) {
                this.nodeFrequencies.set(sentence[i], this.nodeFrequencies.get(sentence[i]) + 1 || 1)
                if(!this.graph.has(sentence[i])) {
                    this.graph.set(sentence[i], {});
                    this.wordToId.set(sentence[i], this.wordToId.size);
                    this.inputWeights.push(Array.from({length: this.dimensionSize}, () => (Math.random() - 0.5) / this.dimensionSize));
                    this.outputWeights.push(Array.from({length: this.dimensionSize}, () => 0));
                }
                if(sentence[i+1]) {
                    this.graph.get(sentence[i])[sentence[i+1]] = (this.graph.get(sentence[i])[sentence[i+1]] || 0) + 1;
                }
            }
        }
    }



    //walk through the graph given a particular start node
    runWalk(startNode) {
        let current = startNode;
        const walk = [current];

        for(let i = 0; i < this.walkLength - 1; i++) {
            if(!this.graph.get(current) || this.graph.get(current).size == 0) break;
            const candidates = Object.keys(this.graph.get(current));
            const weights = Object.values(this.graph.get(current));
            const totalWeight = weights.reduce((sum, next) => sum + next, 0);
            let threshold = Math.random() * totalWeight;
            for(let i = 0; i < candidates.length; i++) {
                threshold -= weights[i];
                if (threshold <= 0) {
                    walk.push(candidates[i])
                    current = candidates[i];
                    break;
                }
            }
        }

        return walk;
    }

    //function to generate the corpus based on the total number of walks at each node, probibalistic sampling
    generateCorpus() {
        const corpus = [];
        const totalWords = this.nodeFrequencies.values().reduce((sum, next) => sum + next, 0);
        
        for(const [word, freq] of this.nodeFrequencies.entries()) {
            for(let i = 0; i < Math.floor(this.walks * freq / totalWords); i++) {
                corpus.push(this.runWalk(word))
            }
        }

        return corpus
    }

    //function to write corpus if you want
    writeCorpus(filePath) {
        let result = ""
        for(const sentence of this.generateCorpus()) {
            result += sentence.join(" ") + "\n";
        }
        fs.writeFileSync(filePath, result)
    }

    //train the model
    train(windowSize = 5, epochs = 5) {
        for(let epoch = 0; epoch < epochs; epoch++) {
            for(const walk of this.generateCorpus()) {
                for(let i = 0; i < walk.length; i++) {
                    const start = Math.max(0, i-windowSize);
                    const end = Math.min(walk.length, i+windowSize+1);
                    for(let j = start; j < end; j++) {
                        if(i == j) continue;
                        this.updateWeights(this.wordToId.get(walk[i]), this.wordToId.get(walk[j]));
                    }
                }
            }
        }
    }
}

const model = new gw2v(false, 10, 100, 300);
model.buildGraph("corpus.txt")
model.writeCorpus("test.txt")