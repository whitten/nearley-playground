import React, {Component} from 'react'
import nearley from 'nearley'

import compile from './compile'
import {ParserRules, ParserStart} from 'nearley/lib/nearley-language-bootstrapped'
import generate from 'nearley/lib/generate.js'
import lint from 'nearley/lib/lint.js'

import CodeMirror  from 'codemirror'

import 'codemirror/lib/codemirror.css'

import 'codemirror/theme/elegant.css'
import './theme.css'

import 'codemirror/addon/mode/multiplex'
import 'codemirror/mode/javascript/javascript'
import 'codemirror/mode/ebnf/ebnf'

import 'codemirror/keymap/sublime'



function stream() {
    let out = ''
    return {
        write(str) {out += str},
        dump() {return out}
    }
}

function get_exports(source){
    let module = {exports:''}
    eval(source)
    return module.exports
}

CodeMirror.defineMode("nearley", config => 
    CodeMirror.multiplexingMode(
        CodeMirror.getMode(config, "ebnf"),
        {   
            open: "{%",
            close: "%}",
            mode: CodeMirror.getMode(config, "javascript"),
            delimStyle: "js-delimit"
        },
        {   
            open: /^\s*#/,
            close: /.$/,
            mode: CodeMirror.getMode(config, "text/plain"),
            delimStyle: "comment-delimit"
        }
    )
)

export default class Editor extends Component {
    state = {
        raw: '',
        output: '',
        errors: ''
    };
    componentDidMount(){
        if(localStorage.raw_grammar) this.compile(localStorage.raw_grammar);
        var cm = CodeMirror(this.refs.wrap, {
            mode: 'nearley',
            value: localStorage.raw_grammar || '',
            tabSize: 4,
            matchBrackets: true,
            autoCloseBrackets: true,
            indentUnit: 4,
            keyMap: 'sublime',
            indentWithTabs: true,
            lineWrapping: true,
            theme: 'elegant',
            viewportMargin: 2,
            // lineNumbers: true,
            // extraKeys: 
        })

        this.cm = cm;
        // global.cm = cm; // DEBUGGING

        cm.on('change', (cm, change) => {
            this.compile(cm.getValue())
        })

    }
    compile(grammar) {

        localStorage.raw_grammar = grammar

        let parser = new nearley.Parser( ParserRules, ParserStart )

        let errors = stream()
        let output = ''

        try {
            parser.feed(grammar)            
            if(parser.results[0]){
                var c = compile(parser.results[0], {});
                lint(c, {out: errors});
                output = generate(c, 'grammar')
                this.props.setGrammar(get_exports(output))
            }
        } catch(e) {
            console.error(e)
            errors.write(e)
        }

        this.setState({
            errors: errors.dump()
        })
    }
    render(){
        return <div className='editor'>
            <div className='cm-wrap' ref='wrap'></div>
            {this.state.errors.length 
                ? <div className='errors'>{this.state.errors}</div>
                : ''}
        </div>
    }
}