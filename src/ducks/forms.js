import uniqBy from "lodash/uniqBy";
import { makeConstant } from "./_helpers";

const constant = makeConstant("jchat/forms");

export const SUBSCRIBE_TO_FORMS = constant("SUBSCRIBE_TO_FORMS");
export const LOADED_FORM_NODES = constant("LOADED_FORM_NODES");
export const LOAD_FORM_TEMPLATES = constant("LOAD_FORM_TEMPLATES");

export const RECEIVED_FORM = constant("RECEIVED_FORM");
export const RECEIVED_FORM_TEMPLATE = constant("RECEIVED_FORM_TEMPLATE");

export const SUBMIT_FORM = constant("SUBMIT_FORM");

export const subscribeToFormNodes = () => ({
    type: SUBSCRIBE_TO_FORMS,
    payload: {}
});

export const loadedFormNodes = (templateNodes, submissionNodes) => ({
    type: LOADED_FORM_NODES,
    payload: {
        templateNodes,
        submissionNodes
    }
});

export const loadFormTemplates = () => ({
    type: LOAD_FORM_TEMPLATES,
    payload: {}
});

export const receivedForm = (form) => ({
  type: RECEIVED_FORM,
  payload: {
      form
  }
});

export const receivedFormTemplate = (template) => ({
type: RECEIVED_FORM_TEMPLATE,
payload: {
    template
}
});

export const submitForm = (node, form) => ({
    type: SUBMIT_FORM,
    payload: {
        node,
        form
    }
  });

const initialState = {
    nodes: {
        templateNodes: [],
        submissionNodes: []
    },
    templates: []
};

// reducer
export default (state = initialState, action) => {
  switch (action.type) {

    case LOADED_FORM_NODES: {

        return {
            ...state,
            nodes: {
                templateNodes: action.payload.templateNodes,
                submissionNodes: action.payload.submissionNodes
            }
        };

    }

    case RECEIVED_FORM_TEMPLATE: {

        let currentTemplates = state.templates;

        return {
            ...state,
            templates: [
                ...currentTemplates,
                action.payload.template
            ]
        };

    }

    case RECEIVED_FORM: {
        
        const form = action.payload.form;
        const peerJid = form.from.bare;
        const peer = state[peerJid] || {
            jid: peerJid,
            forms: []
        };

        if(state[peer.jid] && state[peer.jid].forms) {

            var currentForms = state[peer.jid].forms;
            currentForms.push(form);

            return {
                ...state,
                [peer.jid]: {
                    ...peer,
                    forms: uniqBy(currentForms, 'id')
                }
            };

        } else {

            return {
                ...state,
                [peer.jid]: {
                ...peer,
                forms: [
                    ...peer.forms,
                    form
                    ]
                }
            };

        }

    }

    default:
      return state;
  }
};
