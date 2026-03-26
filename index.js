const fs = require('fs');

class gw2v {
    //init variables
    constructor(walkLength = 10, walks = 100) {
        this.graph = new Map();
        this.nodeFrequencies = new Map();
        this.walkLength = walkLength;
        this.walks = walks;
    }

    //generate co-occurence graph from a .txt corpus w/adjacency lists
    buildGraph(filePath) {
        const fileContent = fs.readFileSync(filePath, "utf8");
        const words = fileContent.replace(/\r/g, "").split("\n").map(line => line.split(" "));
        for(const sentence of words) {
            for(let i = 0; i < sentence.length; i++) {
                this.nodeFrequencies.set(sentence[i], this.nodeFrequencies.get(sentence[i]) + 1 || 1)
                if(!this.graph.has(sentence[i])) this.graph.set(sentence[i], {});
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
}