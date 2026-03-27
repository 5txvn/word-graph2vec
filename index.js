const fs = require('fs');

class gw2v {
    //init variables
    constructor(filePath, logging = false, walkLength = 10, walks = 10000, dimensionSize = 300, learningRate = 0.01, negativeSamples = 5) {
        //init constructor args
        this.graph = new Map();
        this.nodeFrequencies = new Map();
        this.logging = logging;
        this.walkLength = walkLength;
        this.walks = walks;
        this.dimensionSize = dimensionSize;
        this.learningRate = learningRate;
        this.negativeSamples = negativeSamples;
        //init weight matricies and word mappings
        this.wordToId = new Map();
        this.inputWeights = [];
        this.outputWeights = [];
        //build graphs
        this.buildGraph(filePath);
    }

    //generate co-occurence graph from a .txt corpus w/adjacency lists
    buildGraph(filePath) {
        const fileContent = fs.readFileSync(filePath, "utf8");
        const words = fileContent.replace(/\r/g, "").split("\n").map(line => line.split(" "));
        this.actualCorpus = words;
        for(const sentence of words) {
            for(let i = 0; i < sentence.length; i++) {
                this.nodeFrequencies.set(sentence[i], this.nodeFrequencies.get(sentence[i]) + 1 || 1)
                if(!this.graph.has(sentence[i])) {
                    this.graph.set(sentence[i], {});
                    this.wordToId.set(sentence[i], this.wordToId.size);
                    this.inputWeights.push(Array.from({length: this.dimensionSize}, () => (Math.random() - 0.5) / this.dimensionSize));
                    this.outputWeights.push(Array.from({length: this.dimensionSize}, () => (Math.random() - 0.5) / this.dimensionSize));
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
            if(!this.graph.get(current) || Object.keys(this.graph.get(current)).length == 0) break;
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
        const corpus = this.actualCorpus;

        for(let epoch = 0; epoch < epochs; epoch++) {
            for(const walk of corpus) {
                for(let i = 0; i < walk.length; i++) {
                    const start = Math.max(0, i-windowSize);
                    const end = Math.min(walk.length, i+windowSize+1);
                    for(let j = start; j < end; j++) {
                        if(i == j) continue;
                        this.updateWeights(this.wordToId.get(walk[i]), this.wordToId.get(walk[j]), false);
                        for(let k = 0; k < this.negativeSamples; k++) {
                            const vocabulary = Array.from(this.wordToId.keys())
                            const negativeId = this.wordToId.get(vocabulary[Math.floor(Math.random() * vocabulary.length)]);
                            this.updateWeights(this.wordToId.get(walk[i]), negativeId, true);
                        }
                    }
                }
            }
        }
    }

    updateWeights(centerId, contextId, isNegative) {
        const centerVector = this.inputWeights[centerId];
        const contextVector = this.outputWeights[contextId];

        //use dot product to score similarity and calculate gradient using sigmoid function
        let dotProduct = 0;
        for(let i = 0; i < centerVector.length; i++) dotProduct += centerVector[i] * contextVector[i];
        const gradient = 1 / (1 + Math.exp(-dotProduct)) - (isNegative ? 0 : 1);

        for(let i = 0; i < centerVector.length; i++) {
            const oldWeight = centerVector[i];
            centerVector[i] -= this.learningRate * gradient * contextVector[i];
            contextVector[i] -= this.learningRate * gradient * oldWeight;
        }
    }

    getVector(word) {
        return this.inputWeights[this.wordToId.get(word)];
    }

    cosineSimilarity(word1, word2) {
        console.log(Array.from(this.wordToId.keys()))
        if(!this.wordToId.get(word1) || !this.wordToId.get(word2)) throw new Error(`Either ${word1} or ${word2} is not in the corpus vocabulary.`);
        let dotProduct = 0;
        for(let i = 0; i < this.dimensionSize; i++) dotProduct += this.getVector(word1)[i] * this.getVector(word2)[i];
        return dotProduct / Math.sqrt(this.getVector(word1).reduce((sum, next) => sum + next ** 2, 0)) / Math.sqrt(this.getVector(word2).reduce((sum, next) => sum + next ** 2, 0))
    }

}

const model = new gw2v("corpus.txt", false, 10, 10000, 300);
model.train();
console.log(model.cosineSimilarity("cat", "dog"))